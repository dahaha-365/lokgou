import { Elysia } from "elysia";
import {
  UserCreateSchema,
  UserUpdateSchema,
  UserQuerySchema,
  UserIdSchema,
  UserResponseSchema,
  UserNotFoundResponseSchema,
  UserListResponseSchema,
  SuccessResponseSchema,
  AutoCodeRuleRequiredResponseSchema,
} from "@lokgou/schemas";
import { userService } from "./user.service";
import { AutoCodeRuleRequiredError } from "../system/autocode/autocode.service";
import { requestLocale, t } from "@api/lib/i18n";
import { serializeDates, serializeDatesArray } from "@api/lib/serialize";
import { accessibleBy } from "@api/lib/casl-prisma";
import { getAdminAuthorizationHeader } from "@api/lib/config";
import { permissionService } from "../permissions/permission.service";

function accessToken(headers: Record<string, string | undefined>): string | undefined {
  const value = headers[getAdminAuthorizationHeader()];
  return value?.startsWith("Bearer ") ? value.slice(7) : value;
}

function numericClaim(value: unknown): number | null {
  return typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0
    ? Number(value)
    : null;
}

type AccessJwtContext = {
  accessJwt: {
    verify: (token: string | undefined) => Promise<{ sub?: unknown } | false>;
  };
};

export const userController = new Elysia({ prefix: "/users" })
  .post(
    "/",
    async ({ body, request, status }) => {
      try {
        return UserResponseSchema.parse(
          serializeDates(await userService.create(UserCreateSchema.parse(body)))
        );
      } catch (error) {
        if (error instanceof AutoCodeRuleRequiredError) {
          return status(422, {
            message: t(
              requestLocale(request.headers.get("accept-language") ?? undefined),
              "admin.autocode.ruleRequired",
              "USERNAME"
            ),
            code: "AUTOCODE_RULE_REQUIRED",
          });
        }
        throw error;
      }
    },
    {
      body: UserCreateSchema,
      response: { 200: UserResponseSchema, 422: AutoCodeRuleRequiredResponseSchema },
      detail: { tags: ["Users"], summary: "创建用户" },
    }
  )
  .get(
    "/",
    async (context) => {
      const { query, headers } = context;
      const { accessJwt } = context as typeof context & AccessJwtContext;
      const payload = await accessJwt.verify(accessToken(headers));
      const userId = payload ? numericClaim(payload.sub) : null;
      const ability = userId ? await permissionService.abilityFor(userId) : null;
      const result = await userService.list(
        UserQuerySchema.parse(query),
        ability ? accessibleBy(ability, "read").ofType("User") : undefined
      );
      return UserListResponseSchema.parse({ ...result, items: serializeDatesArray(result.items) });
    },
    {
      query: UserQuerySchema,
      response: UserListResponseSchema,
      detail: { tags: ["Users"], summary: "用户列表" },
    }
  )
  .get(
    "/:id",
    async (context) => {
      const { params, request, headers, status } = context;
      const { accessJwt } = context as typeof context & AccessJwtContext;
      const payload = await accessJwt.verify(accessToken(headers));
      const userId = payload ? numericClaim(payload.sub) : null;
      const ability = userId ? await permissionService.abilityFor(userId) : null;
      const user = await userService.show(
        params.id,
        ability ? accessibleBy(ability, "read").ofType("User") : undefined
      );
      if (!user) {
        return status(404, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.users.notFound"
          ),
          code: "USER_NOT_FOUND",
        });
      }
      return UserResponseSchema.parse(serializeDates(user));
    },
    {
      params: UserIdSchema,
      response: { 200: UserResponseSchema, 404: UserNotFoundResponseSchema },
      detail: { tags: ["Users"], summary: "查询用户" },
    }
  )
  .patch(
    "/:id",
    async (context) => {
      const { params, body, request, headers, status } = context;
      const { accessJwt } = context as typeof context & AccessJwtContext;
      const payload = await accessJwt.verify(accessToken(headers));
      const userId = payload ? numericClaim(payload.sub) : null;
      const ability = userId ? await permissionService.abilityFor(userId) : null;
      if (
        !ability ||
        !(await userService.show(params.id, accessibleBy(ability, "update").ofType("User")))
      )
        return status(404, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.users.notFound"
          ),
          code: "USER_NOT_FOUND",
        });
      return UserResponseSchema.parse(
        serializeDates(await userService.update(params.id, UserUpdateSchema.parse(body)))
      );
    },
    {
      params: UserIdSchema,
      body: UserUpdateSchema,
      response: { 200: UserResponseSchema, 404: UserNotFoundResponseSchema },
      detail: { tags: ["Users"], summary: "修改用户" },
    }
  )
  .delete(
    "/:id",
    async (context) => {
      const { params, request, headers, status } = context;
      const { accessJwt } = context as typeof context & AccessJwtContext;
      const payload = await accessJwt.verify(accessToken(headers));
      const userId = payload ? numericClaim(payload.sub) : null;
      const ability = userId ? await permissionService.abilityFor(userId) : null;
      if (
        !ability ||
        !(await userService.show(params.id, accessibleBy(ability, "delete").ofType("User")))
      )
        return status(404, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.users.notFound"
          ),
          code: "USER_NOT_FOUND",
        });
      await userService.softDelete(params.id);
      return { success: true };
    },
    {
      params: UserIdSchema,
      response: { 200: SuccessResponseSchema, 404: UserNotFoundResponseSchema },
      detail: { tags: ["Users"], summary: "删除用户" },
    }
  );
