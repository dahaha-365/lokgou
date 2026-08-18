import { Elysia } from "elysia";
import {
  DepartmentLeaderCreateSchema,
  DepartmentLeaderUpdateSchema,
  DepartmentLeaderQuerySchema,
  DepartmentLeaderIdSchema,
  DepartmentLeaderResponseSchema,
  DepartmentLeaderNotFoundResponseSchema,
  SuccessResponseSchema,
} from "@lokgou/schemas";
import { departmentLeaderService } from "./department-leader.service";
import { requestLocale, t } from "../../../lib/i18n";
import { serializeDates, serializeDatesArray } from "../../../lib/serialize";

export const departmentLeaderController = new Elysia({ prefix: "/department-leaders" })
  .post(
    "/",
    async ({ body }) =>
      DepartmentLeaderResponseSchema.parse(
        serializeDates(
          await departmentLeaderService.create(DepartmentLeaderCreateSchema.parse(body))
        )
      ),
    {
      body: DepartmentLeaderCreateSchema,
      response: DepartmentLeaderResponseSchema,
      detail: { tags: ["Department Leaders"], summary: "创建部门负责人" },
    }
  )
  .get(
    "/",
    async ({ query }) =>
      DepartmentLeaderResponseSchema.array().parse(
        serializeDatesArray(
          await departmentLeaderService.list(DepartmentLeaderQuerySchema.parse(query))
        )
      ),
    {
      query: DepartmentLeaderQuerySchema,
      response: DepartmentLeaderResponseSchema.array(),
      detail: { tags: ["Department Leaders"], summary: "部门负责人列表" },
    }
  )
  .get(
    "/:id",
    async ({ params, request, status }) => {
      const item = await departmentLeaderService.findById(params.id);
      if (!item)
        return status(404, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.departmentLeaders.notFound"
          ),
          code: "DEPARTMENT_LEADER_NOT_FOUND",
        });
      return DepartmentLeaderResponseSchema.parse(serializeDates(item));
    },
    {
      params: DepartmentLeaderIdSchema,
      response: {
        200: DepartmentLeaderResponseSchema,
        404: DepartmentLeaderNotFoundResponseSchema,
      },
      detail: { tags: ["Department Leaders"], summary: "查询部门负责人" },
    }
  )
  .patch(
    "/:id",
    async ({ params, body }) =>
      DepartmentLeaderResponseSchema.parse(
        serializeDates(
          await departmentLeaderService.update(params.id, DepartmentLeaderUpdateSchema.parse(body))
        )
      ),
    {
      params: DepartmentLeaderIdSchema,
      body: DepartmentLeaderUpdateSchema,
      response: DepartmentLeaderResponseSchema,
      detail: { tags: ["Department Leaders"], summary: "修改部门负责人" },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      await departmentLeaderService.delete(params.id);
      return { success: true };
    },
    {
      params: DepartmentLeaderIdSchema,
      response: SuccessResponseSchema,
      detail: { tags: ["Department Leaders"], summary: "删除部门负责人" },
    }
  );
