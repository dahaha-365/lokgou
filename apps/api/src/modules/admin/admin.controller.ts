import { jwt } from "@elysia/jwt";
import { Elysia } from "elysia";
import {
  adminPrefix,
  getAdminAppKey,
  getAdminAuthorizationHeader,
  getJwtSecret,
} from "../../lib/config";
import { authService } from "./auth/auth.service";
import { requestLocale, t } from "../../lib/i18n";
import { adminRoutes } from "./routes";

const jwtSecret = getJwtSecret();
if (!jwtSecret) throw new Error("JWT_SECRET must be configured.");

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
      async beforeHandle({ headers, path, accessJwt, status }) {
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
      },
    },
    (app) => app.use(adminRoutes)
  );
