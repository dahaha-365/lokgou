import { Elysia } from "elysia";
import {
  AuthUnauthorizedResponseSchema,
  MenuCreateSchema,
  MenuEffectiveQuerySchema,
  MenuHasChildrenResponseSchema,
  MenuIdSchema,
  MenuListResponseSchema,
  MenuNotFoundResponseSchema,
  MenuParentNotFoundResponseSchema,
  MenuPermissionNotFoundResponseSchema,
  MenuQuerySchema,
  MenuResponseSchema,
  MenuUpdateSchema,
  MenuUserParamsSchema,
  SuccessResponseSchema,
} from "@lokgou/schemas";
import { getAdminAuthorizationHeader } from "../../../lib/config";
import { requestLocale, t } from "../../../lib/i18n";
import { serializeDates, serializeDatesArray } from "../../../lib/serialize";
import { menuService, type MenuFailure } from "./menu.service";

const error = <T extends MenuFailure>(request: Request, code: T): { message: string; code: T } => ({
  message: t(
    requestLocale(request.headers.get("accept-language") ?? undefined),
    `admin.menus.${
      (
        {
          MENU_NOT_FOUND: "notFound",
          MENU_PARENT_NOT_FOUND: "parentNotFound",
          MENU_PERMISSION_NOT_FOUND: "permissionNotFound",
          MENU_HAS_CHILDREN: "hasChildren",
        } as const
      )[code]
    }`
  ),
  code,
});

const menuFailures = MenuNotFoundResponseSchema.or(MenuParentNotFoundResponseSchema).or(
  MenuPermissionNotFoundResponseSchema
);

function accessToken(headers: Record<string, string | undefined>): string | undefined {
  const value = headers[getAdminAuthorizationHeader()];
  return value?.startsWith("Bearer ") ? value.slice(7) : value;
}

function userIdFromClaim(value: unknown): number | null {
  return typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0
    ? Number(value)
    : null;
}

type AccessJwtContext = {
  accessJwt: {
    verify: (token: string | undefined) => Promise<{ sub?: unknown } | false>;
  };
};

export const menuController = new Elysia({ prefix: "/menus" })
  .post(
    "/",
    async ({ body, request, status }) => {
      const result = await menuService.create(MenuCreateSchema.parse(body));
      return "failure" in result
        ? status(404, error(request, result.failure!))
        : MenuResponseSchema.parse(serializeDates(result.item));
    },
    {
      body: MenuCreateSchema,
      response: { 200: MenuResponseSchema, 404: menuFailures },
      detail: { tags: ["Menus"], summary: "创建菜单" },
    }
  )
  .get(
    "/",
    async ({ query }) => {
      const result = await menuService.list(MenuQuerySchema.parse(query));
      return MenuListResponseSchema.parse({ ...result, items: serializeDatesArray(result.items) });
    },
    {
      query: MenuQuerySchema,
      response: { 200: MenuListResponseSchema },
      detail: { tags: ["Menus"], summary: "菜单列表" },
    }
  )
  .get(
    "/users/:userId/effective",
    async ({ params, query }) => {
      const effectiveQuery = MenuEffectiveQuerySchema.parse(query);
      const items = serializeDatesArray(
        await menuService.effectiveForUser(params.userId, effectiveQuery)
      );
      return MenuListResponseSchema.parse({
        items,
        page: 1,
        pageSize: items.length,
        total: items.length,
      });
    },
    {
      params: MenuUserParamsSchema,
      query: MenuEffectiveQuerySchema,
      response: { 200: MenuListResponseSchema },
      detail: { tags: ["Menus"], summary: "查询用户有效菜单" },
    }
  )
  .get(
    "/effective",
    async (context) => {
      const { headers, query, request, status } = context;
      const { accessJwt } = context as typeof context & AccessJwtContext;
      const payload = await accessJwt.verify(accessToken(headers));
      const userId = payload ? userIdFromClaim(payload.sub) : null;
      if (!userId)
        return status(401, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.auth.invalidAccessToken"
          ),
          code: "AUTH_UNAUTHORIZED",
        });
      const effectiveQuery = MenuEffectiveQuerySchema.parse(query);
      const items = serializeDatesArray(await menuService.effectiveForUser(userId, effectiveQuery));
      return MenuListResponseSchema.parse({
        items,
        page: 1,
        pageSize: items.length,
        total: items.length,
      });
    },
    {
      query: MenuEffectiveQuerySchema,
      response: { 200: MenuListResponseSchema, 401: AuthUnauthorizedResponseSchema },
      detail: { tags: ["Menus"], summary: "查询当前用户有效菜单" },
    }
  )
  .get(
    "/:id",
    async ({ params, request, status }) => {
      const item = await menuService.findById(params.id);
      return item
        ? MenuResponseSchema.parse(serializeDates(item))
        : status(
            404,
            error(request, "MENU_NOT_FOUND") as { message: string; code: "MENU_NOT_FOUND" }
          );
    },
    {
      params: MenuIdSchema,
      response: { 200: MenuResponseSchema, 404: MenuNotFoundResponseSchema },
      detail: { tags: ["Menus"], summary: "查询菜单" },
    }
  )
  .patch(
    "/:id",
    async ({ params, body, request, status }) => {
      const result = await menuService.update(params.id, MenuUpdateSchema.parse(body));
      return "failure" in result
        ? status(404, error(request, result.failure!))
        : MenuResponseSchema.parse(serializeDates(result.item));
    },
    {
      params: MenuIdSchema,
      body: MenuUpdateSchema,
      response: { 200: MenuResponseSchema, 404: menuFailures },
      detail: { tags: ["Menus"], summary: "修改菜单" },
    }
  )
  .delete(
    "/:id",
    async ({ params, request, status }) => {
      const result = await menuService.softDelete(params.id);
      if (!("failure" in result)) return { success: true };
      if (result.failure === "MENU_HAS_CHILDREN")
        return status(409, error(request, "MENU_HAS_CHILDREN"));
      return status(404, error(request, "MENU_NOT_FOUND"));
    },
    {
      params: MenuIdSchema,
      response: {
        200: SuccessResponseSchema,
        404: MenuNotFoundResponseSchema,
        409: MenuHasChildrenResponseSchema,
      },
      detail: { tags: ["Menus"], summary: "删除菜单" },
    }
  );
