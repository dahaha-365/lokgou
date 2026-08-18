import { jwt } from "@elysia/jwt";
import {
  AdminLoginSchema,
  AuthTokenResponseSchema,
  AuthUnauthorizedResponseSchema,
  RefreshTokenSchema,
  SessionIdSchema,
  SessionListResponseSchema,
  SuccessResponseSchema,
  UserResponseSchema,
} from "@lokgou/schemas";
import { Elysia } from "elysia";
import { getAdminAuthorizationHeader, getJwtSecret } from "../../../lib/config";
import { serializeDates, serializeDatesArray } from "../../../lib/serialize";
import { requestLocale, t } from "../../../lib/i18n";
import { accessTokenLifetimeSeconds, authService } from "./auth.service";

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

export const authController = new Elysia({ prefix: "/auth" })
  .use(jwt({ name: "accessJwt", secret: jwtSecret, exp: "15m" }))
  .use(jwt({ name: "refreshJwt", secret: jwtSecret, exp: "30d" }))
  .post(
    "/login",
    async ({ body, accessJwt, refreshJwt, request, status }) => {
      const credentials = AdminLoginSchema.parse(body);
      const user = await authService.authenticate(credentials.username, credentials.password);
      if (!user || !user.isAdmin) {
        return status(401, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.auth.invalidCredentials"
          ),
          code: "AUTH_UNAUTHORIZED",
        });
      }

      const session = await authService.createSession(user.id, "pending");
      const refreshToken = await refreshJwt.sign({
        sub: String(user.id),
        sid: String(session.id),
        typ: "refresh",
      });
      await authService.rotateSession(session.id, "pending", refreshToken);
      return {
        accessToken: await accessJwt.sign({
          sub: String(user.id),
          sid: String(session.id),
          typ: "access",
        }),
        refreshToken,
        expiresIn: accessTokenLifetimeSeconds,
      };
    },
    {
      body: AdminLoginSchema,
      response: { 200: AuthTokenResponseSchema, 401: AuthUnauthorizedResponseSchema },
      detail: { tags: ["Auth"], summary: "管理端登录", security: [{ AdminAppKey: [] }] },
    }
  )
  .post(
    "/refresh",
    async ({ body, accessJwt, refreshJwt, request, status }) => {
      const { refreshToken } = RefreshTokenSchema.parse(body);
      const payload = await refreshJwt.verify(refreshToken);
      if (
        !payload ||
        payload.typ !== "refresh" ||
        !numericClaim(payload.sub) ||
        !numericClaim(payload.sid)
      ) {
        return status(401, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.auth.invalidRefreshToken"
          ),
          code: "AUTH_UNAUTHORIZED",
        });
      }

      const userId = numericClaim(payload.sub)!;
      const sessionId = numericClaim(payload.sid)!;
      const nextRefreshToken = await refreshJwt.sign({
        sub: String(userId),
        sid: String(sessionId),
        typ: "refresh",
      });
      const session = await authService.rotateSession(sessionId, refreshToken, nextRefreshToken);
      if (!session || session.userId !== userId) {
        return status(401, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.auth.invalidRefreshToken"
          ),
          code: "AUTH_UNAUTHORIZED",
        });
      }

      return {
        accessToken: await accessJwt.sign({
          sub: String(userId),
          sid: String(sessionId),
          typ: "access",
        }),
        refreshToken: nextRefreshToken,
        expiresIn: accessTokenLifetimeSeconds,
      };
    },
    {
      body: RefreshTokenSchema,
      response: { 200: AuthTokenResponseSchema, 401: AuthUnauthorizedResponseSchema },
      detail: {
        tags: ["Auth"],
        summary: "刷新访问令牌",
        security: [{ AdminAppKey: [], AdminAccessToken: [] }],
      },
    }
  )
  .get(
    "/me",
    async ({ headers, accessJwt, request, status }) => {
      const payload = await accessJwt.verify(accessToken(headers));
      const userId = payload ? numericClaim(payload.sub) : null;
      const user = userId ? await authService.currentUser(userId) : null;
      if (!user) {
        return status(401, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.auth.invalidAccessToken"
          ),
          code: "AUTH_UNAUTHORIZED",
        });
      }
      return UserResponseSchema.parse(serializeDates(user));
    },
    {
      response: { 200: UserResponseSchema, 401: AuthUnauthorizedResponseSchema },
      detail: {
        tags: ["Auth"],
        summary: "获取当前用户信息",
        security: [{ AdminAppKey: [], AdminAccessToken: [] }],
      },
    }
  )
  .get(
    "/sessions",
    async ({ headers, accessJwt, request, status }) => {
      const payload = await accessJwt.verify(accessToken(headers));
      const userId = payload ? numericClaim(payload.sub) : null;
      if (!userId) {
        return status(401, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.auth.invalidAccessToken"
          ),
          code: "AUTH_UNAUTHORIZED",
        });
      }
      const sessions = await authService.listSessions(userId);
      return SessionListResponseSchema.parse(serializeDatesArray(sessions));
    },
    {
      response: { 200: SessionListResponseSchema, 401: AuthUnauthorizedResponseSchema },
      detail: {
        tags: ["Auth"],
        summary: "查看登录会话",
        security: [{ AdminAppKey: [], AdminAccessToken: [] }],
      },
    }
  )
  .delete(
    "/sessions/:id",
    async ({ headers, params, accessJwt, request, status }) => {
      const payload = await accessJwt.verify(accessToken(headers));
      const userId = payload ? numericClaim(payload.sub) : null;
      if (!userId) {
        return status(401, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.auth.invalidAccessToken"
          ),
          code: "AUTH_UNAUTHORIZED",
        });
      }
      await authService.revokeSession(userId, params.id);
      return { success: true };
    },
    {
      params: SessionIdSchema,
      response: { 200: SuccessResponseSchema, 401: AuthUnauthorizedResponseSchema },
      detail: {
        tags: ["Auth"],
        summary: "退出指定会话",
        security: [{ AdminAppKey: [], AdminAccessToken: [] }],
      },
    }
  );
