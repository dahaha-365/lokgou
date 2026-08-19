import { jwt } from "@elysia/jwt";
import { Elysia } from "elysia";
import {
  adminPrefix,
  getAdminAppKey,
  getAdminAuthorizationHeader,
  getJwtSecret,
} from "../../lib/config";
import { authService } from "./auth/auth.service";
import { permissionService } from "./permissions/permission.service";
import { requestLocale, t } from "../../lib/i18n";
import { prisma } from "../../lib/prisma";
import { adminRoutes } from "./routes";

const jwtSecret = getJwtSecret();
if (!jwtSecret) throw new Error("JWT_SECRET must be configured.");
const adminActors = new WeakMap<Request, number>();

function accessToken(headers: Record<string, string | undefined>): string | undefined {
  const value = headers[getAdminAuthorizationHeader()];
  return value?.startsWith("Bearer ") ? value.slice(7) : value;
}

function numericClaim(value: unknown): number | null {
  return typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0
    ? Number(value)
    : null;
}

export const adminController = new Elysia({ prefix: adminPrefix })
  .use(jwt({ name: "accessJwt", secret: jwtSecret, exp: "15m" }))
  .guard(
    {
      async beforeHandle({ headers, path, request, accessJwt, status }) {
        const adminAppKey = getAdminAppKey();
        const locale = requestLocale(headers["accept-language"]);
        if (!adminAppKey || headers["admin-app-key"] !== adminAppKey) {
          return status(401, {
            message: t(locale, "admin.guard.invalidAppKey"),
            code: "ADMIN_UNAUTHORIZED",
          });
        }
        if (path === `${adminPrefix}/auth/login`) return;

        const payload = await accessJwt.verify(accessToken(headers));
        if (
          !payload ||
          payload.typ !== "access" ||
          !numericClaim(payload.sub) ||
          !numericClaim(payload.sid) ||
          !(await authService.activeSession(numericClaim(payload.sub)!, numericClaim(payload.sid)!))
        ) {
          return status(401, {
            message: t(locale, "admin.auth.invalidAccessToken"),
            code: "AUTH_UNAUTHORIZED",
          });
        }
        if (path.startsWith(`${adminPrefix}/auth/`)) return;
        const userId = numericClaim(payload.sub)!;
        adminActors.set(request, userId);
        const ability = await permissionService.abilityFor(userId);
        const action =
          request.method === "GET" || request.method === "HEAD"
            ? "read"
            : request.method === "POST"
              ? "create"
              : request.method === "PATCH" || request.method === "PUT"
                ? "update"
                : request.method === "DELETE"
                  ? "delete"
                  : "access";
        const resource = path.slice(adminPrefix.length).split("/").filter(Boolean)[0];
        const subject =
          resource === "users"
            ? "User"
            : resource === "departments"
              ? "Department"
              : resource === "roles"
                ? "Role"
                : resource === "permissions"
                  ? "Permission"
                  : resource === "menus"
                    ? "Menu"
                    : resource === "dicts"
                      ? "Dict"
                      : resource === "attachments"
                        ? "Attachment"
                        : resource === "system"
                          ? "AutoCode"
                          : undefined;
        if (subject && !ability.can(action, subject as "User")) {
          return status(403, {
            message: t(locale, "admin.guard.permissionForbidden"),
            code: "PERMISSION_FORBIDDEN",
          });
        }
      },
    },
    (app) =>
      app
        .onAfterHandle(async ({ request, set }) => {
          const actorId = adminActors.get(request);
          const method = request.method;
          const status = typeof set.status === "number" ? set.status : 200;
          if (
            !actorId ||
            !["POST", "PUT", "PATCH", "DELETE"].includes(method) ||
            request.url.includes(`${adminPrefix}/auth/`) ||
            status < 200 ||
            status >= 300
          )
            return;

          const path = new URL(request.url).pathname;
          const resource = path.slice(adminPrefix.length).split("/").filter(Boolean)[0];
          if (!resource) return;
          await prisma.adminOperationLog.create({ data: { actorId, method, resource, path } });
        })
        .use(adminRoutes)
  );
