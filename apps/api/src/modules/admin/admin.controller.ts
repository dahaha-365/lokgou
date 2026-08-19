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
import { adminRoutes } from "./routes";
import { recordOperation } from "./audit-logs/audit-log.service";

const jwtSecret = getJwtSecret();
if (!jwtSecret) throw new Error("JWT_SECRET must be configured.");
const adminActors = new WeakMap<Request, number>();
const resourceSubjects = {
  users: "User",
  departments: "Department",
  roles: "Role",
  permissions: "Permission",
  menus: "Menu",
  dicts: "Dict",
  attachments: "Attachment",
  "audit-logs": "AuditLog",
  system: "AutoCode",
} as const;

type AdminAction = "read" | "create" | "update" | "delete" | "access";

function accessToken(headers: Record<string, string | undefined>): string | undefined {
  const value = headers[getAdminAuthorizationHeader()];
  return value?.startsWith("Bearer ") ? value.slice(7) : value;
}

function numericClaim(value: unknown): number | null {
  return typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0
    ? Number(value)
    : null;
}

function adminResource(path: string) {
  return path.slice(adminPrefix.length).split("/").filter(Boolean)[0];
}

function isAuthPath(path: string) {
  return path.startsWith(`${adminPrefix}/auth/`);
}

function actionForMethod(method: string): AdminAction {
  if (method === "GET" || method === "HEAD") return "read";
  if (method === "POST") return "create";
  if (method === "PATCH" || method === "PUT") return "update";
  if (method === "DELETE") return "delete";
  return "access";
}

function operationAction(method: string) {
  return method === "POST" ? "create" : method === "DELETE" ? "delete" : "update";
}

function targetIdFromPath(path: string, resource: string): number | null {
  const segments = path.slice(adminPrefix.length).split("/").filter(Boolean);
  if (segments[0] !== resource || !/^\d+$/.test(segments[1] ?? "")) return null;
  const targetId = Number(segments[1]);
  return Number.isSafeInteger(targetId) && targetId > 0 ? targetId : null;
}

function targetIdFromResponse(response: unknown): number | null {
  if (!response || typeof response !== "object" || !("id" in response)) return null;
  const id = response.id;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
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
        const userId = numericClaim(payload && payload.sub);
        const sessionId = numericClaim(payload && payload.sid);
        if (
          !payload ||
          payload.typ !== "access" ||
          !userId ||
          !sessionId ||
          !(await authService.activeSession(userId, sessionId))
        ) {
          return status(401, {
            message: t(locale, "admin.auth.invalidAccessToken"),
            code: "AUTH_UNAUTHORIZED",
          });
        }
        if (path.startsWith(`${adminPrefix}/auth/`)) return;
        adminActors.set(request, userId);

        const resource = adminResource(path);
        const subject = resource
          ? resourceSubjects[resource as keyof typeof resourceSubjects]
          : undefined;
        if (!subject) return;

        const ability = await permissionService.abilityFor(userId);
        if (!ability.can(actionForMethod(request.method), subject as "User")) {
          return status(403, {
            message: t(locale, "admin.guard.permissionForbidden"),
            code: "PERMISSION_FORBIDDEN",
          });
        }
      },
    },
    (app) =>
      app
        .onAfterHandle(async ({ request, response, set }) => {
          const actorId = adminActors.get(request);
          const method = request.method;
          const status = typeof set.status === "number" ? set.status : 200;
          if (
            !actorId ||
            !["POST", "PUT", "PATCH", "DELETE"].includes(method) ||
            isAuthPath(new URL(request.url).pathname) ||
            status < 200 ||
            status >= 300
          )
            return;

          const path = new URL(request.url).pathname;
          const resource = adminResource(path);
          if (!resource) return;
          await recordOperation({
            actorId,
            method,
            action: operationAction(method),
            resource,
            targetResource: resource,
            targetId:
              method === "POST"
                ? (targetIdFromResponse(response) ?? targetIdFromPath(path, resource))
                : targetIdFromPath(path, resource),
            path,
          });
        })
        .use(adminRoutes)
  );
