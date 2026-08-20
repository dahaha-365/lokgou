import { Elysia } from "elysia";
import {
  DictCreateSchema,
  DictHasItemsResponseSchema,
  DictIdSchema,
  DictItemCreateSchema,
  DictItemListResponseSchema,
  DictItemNotFoundResponseSchema,
  DictItemParamsSchema,
  DictItemQuerySchema,
  DictItemResponseSchema,
  DictItemUpdateSchema,
  DictListResponseSchema,
  DictNotFoundResponseSchema,
  DictQuerySchema,
  DictResponseSchema,
  DictUpdateSchema,
  SuccessResponseSchema,
} from "@lokgou/schemas";
import { requestLocale, t } from "@api/lib/i18n";
import { serializeDates, serializeDatesArray } from "@api/lib/serialize";
import { dictService, type DictFailure, type DictItemFailure } from "./dict.service";

function error(
  request: Request,
  code: "DICT_NOT_FOUND"
): { message: string; code: "DICT_NOT_FOUND" };
function error(
  request: Request,
  code: "DICT_ITEM_NOT_FOUND"
): { message: string; code: "DICT_ITEM_NOT_FOUND" };
function error(
  request: Request,
  code: "DICT_HAS_ITEMS"
): { message: string; code: "DICT_HAS_ITEMS" };
function error(request: Request, code: DictFailure | DictItemFailure) {
  return {
    message: t(
      requestLocale(request.headers.get("accept-language") ?? undefined),
      `admin.dicts.${
        (
          {
            DICT_NOT_FOUND: "notFound",
            DICT_ITEM_NOT_FOUND: "itemNotFound",
            DICT_HAS_ITEMS: "hasItems",
          } as const
        )[code]
      }`
    ),
    code,
  };
}

function itemError(request: Request, code: DictItemFailure) {
  return code === "DICT_NOT_FOUND"
    ? error(request, "DICT_NOT_FOUND")
    : error(request, "DICT_ITEM_NOT_FOUND");
}

const itemFailures = DictNotFoundResponseSchema.or(DictItemNotFoundResponseSchema);

export const dictController = new Elysia({ prefix: "/dicts" })
  .post(
    "/",
    async ({ body }) => {
      const result = await dictService.create(DictCreateSchema.parse(body));
      return DictResponseSchema.parse(serializeDates(result.item));
    },
    {
      body: DictCreateSchema,
      response: { 200: DictResponseSchema },
      detail: { tags: ["Dicts"], summary: "创建数据字典" },
    }
  )
  .get(
    "/",
    async ({ query }) => {
      const result = await dictService.list(DictQuerySchema.parse(query));
      return DictListResponseSchema.parse({ ...result, items: serializeDatesArray(result.items) });
    },
    {
      query: DictQuerySchema,
      response: { 200: DictListResponseSchema },
      detail: { tags: ["Dicts"], summary: "数据字典列表" },
    }
  )
  .post(
    "/:id/items",
    async ({ params, body, request, status }) => {
      const result = await dictService.createItem(params.id, DictItemCreateSchema.parse(body));
      return "failure" in result
        ? status(404, error(request, result.failure!))
        : DictItemResponseSchema.parse(serializeDates(result.item));
    },
    {
      params: DictIdSchema,
      body: DictItemCreateSchema,
      response: { 200: DictItemResponseSchema, 404: DictNotFoundResponseSchema },
      detail: { tags: ["Dicts"], summary: "创建数据字典项" },
    }
  )
  .get(
    "/:id/items",
    async ({ params, query, request, status }) => {
      const result = await dictService.listItems(params.id, DictItemQuerySchema.parse(query));
      return "failure" in result
        ? status(404, error(request, result.failure!))
        : DictItemListResponseSchema.parse({ ...result, items: serializeDatesArray(result.items) });
    },
    {
      params: DictIdSchema,
      query: DictItemQuerySchema,
      response: { 200: DictItemListResponseSchema, 404: DictNotFoundResponseSchema },
      detail: { tags: ["Dicts"], summary: "数据字典项列表" },
    }
  )
  .get(
    "/:id/items/:itemId",
    async ({ params, request, status }) => {
      const result = await dictService.findItem(params.id, params.itemId);
      return "failure" in result
        ? status(404, itemError(request, result.failure!))
        : DictItemResponseSchema.parse(serializeDates(result.item));
    },
    {
      params: DictItemParamsSchema,
      response: { 200: DictItemResponseSchema, 404: itemFailures },
      detail: { tags: ["Dicts"], summary: "查询数据字典项" },
    }
  )
  .patch(
    "/:id/items/:itemId",
    async ({ params, body, request, status }) => {
      const result = await dictService.updateItem(
        params.id,
        params.itemId,
        DictItemUpdateSchema.parse(body)
      );
      return "failure" in result
        ? status(404, itemError(request, result.failure!))
        : DictItemResponseSchema.parse(serializeDates(result.item));
    },
    {
      params: DictItemParamsSchema,
      body: DictItemUpdateSchema,
      response: { 200: DictItemResponseSchema, 404: itemFailures },
      detail: { tags: ["Dicts"], summary: "修改数据字典项" },
    }
  )
  .delete(
    "/:id/items/:itemId",
    async ({ params, request, status }) => {
      const result = await dictService.softDeleteItem(params.id, params.itemId);
      return "failure" in result
        ? status(404, itemError(request, result.failure!))
        : { success: true };
    },
    {
      params: DictItemParamsSchema,
      response: { 200: SuccessResponseSchema, 404: itemFailures },
      detail: { tags: ["Dicts"], summary: "删除数据字典项" },
    }
  )
  .get(
    "/:id",
    async ({ params, request, status }) => {
      const item = await dictService.show(params.id);
      return item
        ? DictResponseSchema.parse(serializeDates(item))
        : status(404, error(request, "DICT_NOT_FOUND"));
    },
    {
      params: DictIdSchema,
      response: { 200: DictResponseSchema, 404: DictNotFoundResponseSchema },
      detail: { tags: ["Dicts"], summary: "查询数据字典" },
    }
  )
  .patch(
    "/:id",
    async ({ params, body, request, status }) => {
      const result = await dictService.update(params.id, DictUpdateSchema.parse(body));
      return "failure" in result
        ? status(404, error(request, result.failure!))
        : DictResponseSchema.parse(serializeDates(result.item));
    },
    {
      params: DictIdSchema,
      body: DictUpdateSchema,
      response: { 200: DictResponseSchema, 404: DictNotFoundResponseSchema },
      detail: { tags: ["Dicts"], summary: "修改数据字典" },
    }
  )
  .delete(
    "/:id",
    async ({ params, request, status }) => {
      const result = await dictService.softDelete(params.id);
      if (!("failure" in result)) return { success: true };
      return result.failure === "DICT_HAS_ITEMS"
        ? status(409, error(request, "DICT_HAS_ITEMS"))
        : status(404, error(request, "DICT_NOT_FOUND"));
    },
    {
      params: DictIdSchema,
      response: {
        200: SuccessResponseSchema,
        404: DictNotFoundResponseSchema,
        409: DictHasItemsResponseSchema,
      },
      detail: { tags: ["Dicts"], summary: "删除数据字典" },
    }
  );
