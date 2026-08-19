import { Elysia } from "elysia";
import {
  RoleDepartmentNotFoundResponseSchema,
  DepartmentRoleConfigureSchema,
  DepartmentRoleNotFoundResponseSchema,
  DepartmentRoleResponseSchema,
  RoleCreateSchema,
  RoleDepartmentParamsSchema,
  RoleDepartmentUserParamsSchema,
  RoleIdSchema,
  RoleListResponseSchema,
  RoleNotFoundResponseSchema,
  RoleQuerySchema,
  RoleResponseSchema,
  RoleUpdateSchema,
  RoleUserParamsSchema,
  SuccessResponseSchema,
  UserDepartmentRoleAssignSchema,
  UserDepartmentRoleNotFoundResponseSchema,
  UserDepartmentRoleResponseSchema,
  RoleUserNotFoundResponseSchema,
  UserRoleResponseSchema,
} from "@lokgou/schemas";
import { requestLocale, t } from "../../../lib/i18n";
import { serializeDates } from "../../../lib/serialize";
import { roleService } from "./role.service";

const UserNotFoundResponseSchema = RoleUserNotFoundResponseSchema;
const DepartmentNotFoundResponseSchema = RoleDepartmentNotFoundResponseSchema;
const error = <
  T extends
    | "ROLE_NOT_FOUND"
    | "USER_NOT_FOUND"
    | "DEPARTMENT_NOT_FOUND"
    | "DEPARTMENT_ROLE_NOT_FOUND"
    | "USER_DEPARTMENT_ROLE_NOT_FOUND",
>(
  request: Request,
  code: T
): { message: string; code: T } => ({
  message: t(
    requestLocale(request.headers.get("accept-language") ?? undefined),
    `admin.roles.${({ ROLE_NOT_FOUND: "notFound", USER_NOT_FOUND: "userNotFound", DEPARTMENT_NOT_FOUND: "departmentNotFound", DEPARTMENT_ROLE_NOT_FOUND: "departmentRoleNotFound", USER_DEPARTMENT_ROLE_NOT_FOUND: "userDepartmentRoleNotFound" } as const)[code]}`
  ),
  code,
});
const roleView = (role: Record<string, unknown>) => ({
  ...serializeDates(role),
  permissions: JSON.parse(role.permissions as string),
});
const departmentRoleView = (item: Record<string, unknown>) => ({
  ...serializeDates(item),
  grantedPermissions: JSON.parse(item.grantedPermissions as string),
  revokedPermissions: JSON.parse(item.revokedPermissions as string),
});

export const roleController = new Elysia({ prefix: "/roles" })
  .post(
    "/",
    async ({ body }) =>
      RoleResponseSchema.parse(roleView(await roleService.create(RoleCreateSchema.parse(body)))),
    {
      body: RoleCreateSchema,
      response: { 200: RoleResponseSchema },
      detail: { tags: ["Roles"], summary: "创建角色" },
    }
  )
  .get(
    "/",
    async ({ query }) => {
      const result = await roleService.list(RoleQuerySchema.parse(query));
      return RoleListResponseSchema.parse({ ...result, items: result.items.map(roleView) });
    },
    {
      query: RoleQuerySchema,
      response: { 200: RoleListResponseSchema },
      detail: { tags: ["Roles"], summary: "角色列表" },
    }
  )
  .get(
    "/:id",
    async ({ params, request, status }) => {
      const item = await roleService.findById(params.id);
      return item
        ? RoleResponseSchema.parse(roleView(item))
        : status(404, error(request, "ROLE_NOT_FOUND"));
    },
    {
      params: RoleIdSchema,
      response: { 200: RoleResponseSchema, 404: RoleNotFoundResponseSchema },
      detail: { tags: ["Roles"], summary: "查询角色" },
    }
  )
  .patch(
    "/:id",
    async ({ params, body, request, status }) => {
      if (!(await roleService.findById(params.id)))
        return status(404, error(request, "ROLE_NOT_FOUND"));
      return RoleResponseSchema.parse(
        roleView(await roleService.update(params.id, RoleUpdateSchema.parse(body)))
      );
    },
    {
      params: RoleIdSchema,
      body: RoleUpdateSchema,
      response: { 200: RoleResponseSchema, 404: RoleNotFoundResponseSchema },
      detail: { tags: ["Roles"], summary: "修改角色" },
    }
  )
  .delete(
    "/:id",
    async ({ params, request, status }) => {
      if (!(await roleService.findById(params.id)))
        return status(404, error(request, "ROLE_NOT_FOUND"));
      await roleService.softDelete(params.id);
      return { success: true };
    },
    {
      params: RoleIdSchema,
      response: { 200: SuccessResponseSchema, 404: RoleNotFoundResponseSchema },
      detail: { tags: ["Roles"], summary: "删除角色" },
    }
  )
  .put(
    "/:id/users/:userId",
    async ({ params, request, status }) => {
      if (!(await roleService.findById(params.id)))
        return status(404, error(request, "ROLE_NOT_FOUND"));
      if (!(await roleService.findUser(params.userId)))
        return status(404, error(request, "USER_NOT_FOUND"));
      return UserRoleResponseSchema.parse(
        serializeDates(await roleService.assignUser(params.id, params.userId))
      );
    },
    {
      params: RoleUserParamsSchema,
      response: {
        200: UserRoleResponseSchema,
        404: RoleNotFoundResponseSchema.or(UserNotFoundResponseSchema),
      },
      detail: { tags: ["Roles"], summary: "分配全局角色" },
    }
  )
  .delete(
    "/:id/users/:userId",
    async ({ params, request, status }) => {
      if (!(await roleService.findById(params.id)))
        return status(404, error(request, "ROLE_NOT_FOUND"));
      if (!(await roleService.findUser(params.userId)))
        return status(404, error(request, "USER_NOT_FOUND"));
      await roleService.removeUser(params.id, params.userId);
      return { success: true };
    },
    {
      params: RoleUserParamsSchema,
      response: {
        200: SuccessResponseSchema,
        404: RoleNotFoundResponseSchema.or(UserNotFoundResponseSchema),
      },
      detail: { tags: ["Roles"], summary: "移除全局角色" },
    }
  )
  .put(
    "/:id/departments/:departmentId",
    async ({ params, body, request, status }) => {
      if (!(await roleService.findById(params.id)))
        return status(404, error(request, "ROLE_NOT_FOUND"));
      if (!(await roleService.findDepartment(params.departmentId)))
        return status(404, error(request, "DEPARTMENT_NOT_FOUND"));
      return DepartmentRoleResponseSchema.parse(
        departmentRoleView(
          await roleService.configureDepartment(
            params.id,
            params.departmentId,
            DepartmentRoleConfigureSchema.parse(body)
          )
        )
      );
    },
    {
      params: RoleDepartmentParamsSchema,
      body: DepartmentRoleConfigureSchema,
      response: {
        200: DepartmentRoleResponseSchema,
        404: RoleNotFoundResponseSchema.or(DepartmentNotFoundResponseSchema),
      },
      detail: { tags: ["Roles"], summary: "配置部门角色" },
    }
  )
  .delete(
    "/:id/departments/:departmentId",
    async ({ params, request, status }) => {
      if (!(await roleService.findById(params.id)))
        return status(404, error(request, "ROLE_NOT_FOUND"));
      const item = await roleService.findDepartmentRole(params.id, params.departmentId);
      if (!item) return status(404, error(request, "DEPARTMENT_ROLE_NOT_FOUND"));
      await roleService.removeDepartmentRole(params.id, params.departmentId);
      return { success: true };
    },
    {
      params: RoleDepartmentParamsSchema,
      response: {
        200: SuccessResponseSchema,
        404: RoleNotFoundResponseSchema.or(DepartmentRoleNotFoundResponseSchema),
      },
      detail: { tags: ["Roles"], summary: "移除部门角色配置" },
    }
  )
  .put(
    "/:id/departments/:departmentId/users/:userId",
    async ({ params, body, request, status }) => {
      if (!(await roleService.findById(params.id)))
        return status(404, error(request, "ROLE_NOT_FOUND"));
      if (!(await roleService.findDepartment(params.departmentId)))
        return status(404, error(request, "DEPARTMENT_NOT_FOUND"));
      if (!(await roleService.findUser(params.userId)))
        return status(404, error(request, "USER_NOT_FOUND"));
      const departmentRole = await roleService.findDepartmentRole(params.id, params.departmentId);
      if (!departmentRole) return status(404, error(request, "DEPARTMENT_ROLE_NOT_FOUND"));
      return UserDepartmentRoleResponseSchema.parse(
        serializeDates(
          await roleService.assignDepartmentUser(
            departmentRole.id,
            params.userId,
            UserDepartmentRoleAssignSchema.parse(body)
          )
        )
      );
    },
    {
      params: RoleDepartmentUserParamsSchema,
      body: UserDepartmentRoleAssignSchema,
      response: {
        200: UserDepartmentRoleResponseSchema,
        404: RoleNotFoundResponseSchema.or(DepartmentNotFoundResponseSchema)
          .or(UserNotFoundResponseSchema)
          .or(DepartmentRoleNotFoundResponseSchema),
      },
      detail: { tags: ["Roles"], summary: "分配部门角色" },
    }
  )
  .delete(
    "/:id/departments/:departmentId/users/:userId",
    async ({ params, request, status }) => {
      if (!(await roleService.findById(params.id)))
        return status(404, error(request, "ROLE_NOT_FOUND"));
      const departmentRole = await roleService.findDepartmentRole(params.id, params.departmentId);
      if (!departmentRole) return status(404, error(request, "DEPARTMENT_ROLE_NOT_FOUND"));
      const item = await roleService.endDepartmentUser(departmentRole.id, params.userId);
      return item
        ? UserDepartmentRoleResponseSchema.parse(serializeDates(item))
        : status(404, error(request, "USER_DEPARTMENT_ROLE_NOT_FOUND"));
    },
    {
      params: RoleDepartmentUserParamsSchema,
      response: {
        200: UserDepartmentRoleResponseSchema,
        404: RoleNotFoundResponseSchema.or(DepartmentRoleNotFoundResponseSchema).or(
          UserDepartmentRoleNotFoundResponseSchema
        ),
      },
      detail: { tags: ["Roles"], summary: "结束部门角色分配" },
    }
  );
