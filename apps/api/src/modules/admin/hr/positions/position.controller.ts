import { Elysia } from "elysia";
import {
  PositionCreateSchema,
  PositionUpdateSchema,
  PositionQuerySchema,
  PositionIdSchema,
  PositionResponseSchema,
  PositionNotFoundResponseSchema,
  PositionListResponseSchema,
  SuccessResponseSchema,
} from "@lokgou/schemas";
import { positionService } from "./position.service";
import { createCrudModule, type CrudRouteContract } from "@api/lib/crud-service";
import { requestLocale, t } from "@api/lib/i18n";
import { serializeDates, serializeDatesArray } from "@api/lib/serialize";

type PositionRouteService = Pick<
  typeof positionService,
  "create" | "list" | "show" | "update" | "delete"
>;

const positionRouteContract: CrudRouteContract<typeof positionService, PositionRouteService> = [
  {
    serviceMethod: "create",
    register: (service) =>
      new Elysia().post(
        "/",
        async ({ body }) =>
          PositionResponseSchema.parse(
            serializeDates(await service.create(PositionCreateSchema.parse(body)))
          ),
        {
          body: PositionCreateSchema,
          response: PositionResponseSchema,
          detail: { tags: ["Positions"], summary: "创建职位" },
        }
      ),
  },
  {
    serviceMethod: "list",
    register: (service) =>
      new Elysia().get(
        "/",
        async ({ query }) => {
          const result = await service.list(PositionQuerySchema.parse(query));
          return PositionListResponseSchema.parse({
            ...result,
            items: serializeDatesArray(result.items),
          });
        },
        {
          query: PositionQuerySchema,
          response: PositionListResponseSchema,
          detail: { tags: ["Positions"], summary: "职位列表" },
        }
      ),
  },
  {
    serviceMethod: "show",
    register: (service) =>
      new Elysia().get(
        "/:id",
        async ({ params, request, status }) => {
          const position = await service.show(params.id);
          if (!position)
            return status(404, {
              message: t(
                requestLocale(request.headers.get("accept-language") ?? undefined),
                "admin.positions.notFound"
              ),
              code: "POSITION_NOT_FOUND",
            });
          return PositionResponseSchema.parse(serializeDates(position));
        },
        {
          params: PositionIdSchema,
          response: { 200: PositionResponseSchema, 404: PositionNotFoundResponseSchema },
          detail: { tags: ["Positions"], summary: "查询职位" },
        }
      ),
  },
  {
    serviceMethod: "update",
    register: (service) =>
      new Elysia().patch(
        "/:id",
        async ({ params, body }) =>
          PositionResponseSchema.parse(
            serializeDates(await service.update(params.id, PositionUpdateSchema.parse(body)))
          ),
        {
          params: PositionIdSchema,
          body: PositionUpdateSchema,
          response: PositionResponseSchema,
          detail: { tags: ["Positions"], summary: "修改职位" },
        }
      ),
  },
  {
    serviceMethod: "delete",
    register: (service) =>
      new Elysia().delete(
        "/:id",
        async ({ params }) => {
          await service.delete(params.id);
          return { success: true };
        },
        {
          params: PositionIdSchema,
          response: SuccessResponseSchema,
          detail: { tags: ["Positions"], summary: "删除职位" },
        }
      ),
  },
];

export const positionController = createCrudModule(
  positionService,
  {},
  positionRouteContract
).routes;
