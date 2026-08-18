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
import { requestLocale, t } from "../../../lib/i18n";
import { serializeDates, serializeDatesArray } from "../../../lib/serialize";

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
    async ({ query }) => {
      const result = await userService.list(UserQuerySchema.parse(query));
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
    async ({ params, request, status }) => {
      const user = await userService.findById(params.id);
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
    async ({ params, body }) =>
      UserResponseSchema.parse(
        serializeDates(await userService.update(params.id, UserUpdateSchema.parse(body)))
      ),
    {
      params: UserIdSchema,
      body: UserUpdateSchema,
      response: UserResponseSchema,
      detail: { tags: ["Users"], summary: "修改用户" },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      await userService.softDelete(params.id);
      return { success: true };
    },
    {
      params: UserIdSchema,
      response: SuccessResponseSchema,
      detail: { tags: ["Users"], summary: "删除用户" },
    }
  );
