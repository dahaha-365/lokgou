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
import { requestLocale, t } from "../../../../lib/i18n";
import { serializeDates, serializeDatesArray } from "../../../../lib/serialize";

export const positionController = new Elysia()
  .post(
    "/",
    async ({ body }) =>
      PositionResponseSchema.parse(
        serializeDates(await positionService.create(PositionCreateSchema.parse(body)))
      ),
    {
      body: PositionCreateSchema,
      response: PositionResponseSchema,
      detail: { tags: ["Positions"], summary: "创建职位" },
    }
  )
  .get(
    "/",
    async ({ query }) => {
      const result = await positionService.list(PositionQuerySchema.parse(query));
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
  )
  .get(
    "/:id",
    async ({ params, request, status }) => {
      const position = await positionService.findById(params.id);
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
  )
  .patch(
    "/:id",
    async ({ params, body }) =>
      PositionResponseSchema.parse(
        serializeDates(await positionService.update(params.id, PositionUpdateSchema.parse(body)))
      ),
    {
      params: PositionIdSchema,
      body: PositionUpdateSchema,
      response: PositionResponseSchema,
      detail: { tags: ["Positions"], summary: "修改职位" },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      await positionService.softDelete(params.id);
      return { success: true };
    },
    {
      params: PositionIdSchema,
      response: SuccessResponseSchema,
      detail: { tags: ["Positions"], summary: "删除职位" },
    }
  );
