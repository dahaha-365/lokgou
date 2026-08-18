import { Elysia } from "elysia";
import {
  DepartmentCreateSchema,
  DepartmentUpdateSchema,
  DepartmentQuerySchema,
  DepartmentIdSchema,
  DepartmentResponseSchema,
  DepartmentNotFoundResponseSchema,
  DepartmentListResponseSchema,
  SuccessResponseSchema,
  AutoCodeRuleRequiredResponseSchema,
} from "@lokgou/schemas";
import { departmentService } from "./department.service";
import { AutoCodeRuleRequiredError } from "../system/autocode/autocode.service";
import { requestLocale, t } from "../../../lib/i18n";
import { serializeDates, serializeDatesArray } from "../../../lib/serialize";

export const departmentController = new Elysia({ prefix: "/departments" })
  .post(
    "/",
    async ({ body, request, status }) => {
      try {
        return DepartmentResponseSchema.parse(
          serializeDates(await departmentService.create(DepartmentCreateSchema.parse(body)))
        );
      } catch (error) {
        if (error instanceof AutoCodeRuleRequiredError) {
          return status(422, {
            message: t(
              requestLocale(request.headers.get("accept-language") ?? undefined),
              "admin.autocode.ruleRequired",
              "DEPARTMENT_CODE"
            ),
            code: "AUTOCODE_RULE_REQUIRED",
          });
        }
        throw error;
      }
    },
    {
      body: DepartmentCreateSchema,
      response: { 200: DepartmentResponseSchema, 422: AutoCodeRuleRequiredResponseSchema },
      detail: { tags: ["Departments"], summary: "创建部门" },
    }
  )
  .get(
    "/",
    async ({ query }) => {
      const result = await departmentService.list(DepartmentQuerySchema.parse(query));
      return DepartmentListResponseSchema.parse({
        ...result,
        items: serializeDatesArray(result.items),
      });
    },
    {
      query: DepartmentQuerySchema,
      response: DepartmentListResponseSchema,
      detail: { tags: ["Departments"], summary: "部门列表" },
    }
  )
  .get(
    "/:id",
    async ({ params, request, status }) => {
      const department = await departmentService.findById(params.id);
      if (!department)
        return status(404, {
          message: t(
            requestLocale(request.headers.get("accept-language") ?? undefined),
            "admin.departments.notFound"
          ),
          code: "DEPARTMENT_NOT_FOUND",
        });
      return DepartmentResponseSchema.parse(serializeDates(department));
    },
    {
      params: DepartmentIdSchema,
      response: { 200: DepartmentResponseSchema, 404: DepartmentNotFoundResponseSchema },
      detail: { tags: ["Departments"], summary: "查询部门" },
    }
  )
  .patch(
    "/:id",
    async ({ params, body }) =>
      DepartmentResponseSchema.parse(
        serializeDates(
          await departmentService.update(params.id, DepartmentUpdateSchema.parse(body))
        )
      ),
    {
      params: DepartmentIdSchema,
      body: DepartmentUpdateSchema,
      response: DepartmentResponseSchema,
      detail: { tags: ["Departments"], summary: "修改部门" },
    }
  )
  .delete(
    "/:id",
    async ({ params }) => {
      await departmentService.softDelete(params.id);
      return { success: true };
    },
    {
      params: DepartmentIdSchema,
      response: SuccessResponseSchema,
      detail: { tags: ["Departments"], summary: "删除部门" },
    }
  );
