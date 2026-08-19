import { Elysia } from "elysia";
import {
  DepartmentRolePermissionParamsSchema,
  DepartmentRolePermissionResponseSchema,
  EffectivePermissionListResponseSchema,
  PermissionAssignmentSchema,
  PermissionCreateSchema,
  PermissionIdSchema,
  PermissionListResponseSchema,
  PermissionNotFoundResponseSchema,
  PermissionQuerySchema,
  PermissionResponseSchema,
  PermissionUpdateSchema,
  RolePermissionParamsSchema,
  RolePermissionResponseSchema,
  SuccessResponseSchema,
  UserPermissionParamsSchema,
  UserPermissionResponseSchema,
  UserRolePermissionParamsSchema,
  UserRolePermissionResponseSchema,
} from "@lokgou/schemas";
import { serializeDates, serializeDatesArray } from "../../../lib/serialize";
import { permissionService } from "./permission.service";

const permissionNotFound = {
  message: "Permission not found",
  code: "PERMISSION_NOT_FOUND",
} as const;
const assignmentOwnerNotFound = {
  message: "Permission assignment owner not found",
  code: "PERMISSION_NOT_FOUND",
} as const;

async function requirePermission(permissionId: number) {
  return Boolean(await permissionService.findById(permissionId));
}

async function requireAssignmentOwner(
  owner: "user" | "role" | "userRole" | "departmentRole",
  id: number
) {
  return permissionService.ensureAssignmentOwner(owner, id);
}

export const permissionController = new Elysia({ prefix: "/permissions" })
  .post(
    "/",
    async ({ body }) =>
      PermissionResponseSchema.parse(
        serializeDates(await permissionService.create(PermissionCreateSchema.parse(body)))
      ),
    {
      body: PermissionCreateSchema,
      response: { 200: PermissionResponseSchema },
      detail: { tags: ["Permissions"], summary: "创建权限" },
    }
  )
  .get(
    "/",
    async ({ query }) => {
      const result = await permissionService.list(PermissionQuerySchema.parse(query));
      return PermissionListResponseSchema.parse({
        ...result,
        items: serializeDatesArray(result.items),
      });
    },
    {
      query: PermissionQuerySchema,
      response: { 200: PermissionListResponseSchema },
      detail: { tags: ["Permissions"], summary: "权限列表" },
    }
  )
  .get(
    "/users/:userId/effective",
    async ({ params }) =>
      EffectivePermissionListResponseSchema.parse(
        await permissionService.effectivePermissions(params.userId)
      ),
    {
      params: UserPermissionParamsSchema.pick({ userId: true }),
      response: { 200: EffectivePermissionListResponseSchema },
      detail: { tags: ["Permissions"], summary: "查询用户有效权限" },
    }
  )
  .put(
    "/users/:userId/:permissionId",
    async ({ params, body, status }) => {
      if (!(await requirePermission(params.permissionId))) return status(404, permissionNotFound);
      if (!(await requireAssignmentOwner("user", params.userId)))
        return status(404, assignmentOwnerNotFound);
      return UserPermissionResponseSchema.parse(
        serializeDates(
          await permissionService.assignUser(
            params.userId,
            params.permissionId,
            PermissionAssignmentSchema.parse(body)
          )
        )
      );
    },
    {
      params: UserPermissionParamsSchema,
      body: PermissionAssignmentSchema,
      response: { 200: UserPermissionResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "分配用户权限" },
    }
  )
  .delete(
    "/users/:userId/:permissionId",
    async ({ params, status }) => {
      if (!(await requirePermission(params.permissionId))) return status(404, permissionNotFound);
      if (!(await requireAssignmentOwner("user", params.userId)))
        return status(404, assignmentOwnerNotFound);
      await permissionService.removeUser(params.userId, params.permissionId);
      return { success: true };
    },
    {
      params: UserPermissionParamsSchema,
      response: { 200: SuccessResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "移除用户权限" },
    }
  )
  .put(
    "/roles/:roleId/:permissionId",
    async ({ params, body, status }) => {
      if (!(await requirePermission(params.permissionId))) return status(404, permissionNotFound);
      if (!(await requireAssignmentOwner("role", params.roleId)))
        return status(404, assignmentOwnerNotFound);
      return RolePermissionResponseSchema.parse(
        serializeDates(
          await permissionService.assignRole(
            params.roleId,
            params.permissionId,
            PermissionAssignmentSchema.parse(body)
          )
        )
      );
    },
    {
      params: RolePermissionParamsSchema,
      body: PermissionAssignmentSchema,
      response: { 200: RolePermissionResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "分配角色权限" },
    }
  )
  .delete(
    "/roles/:roleId/:permissionId",
    async ({ params, status }) => {
      if (!(await requirePermission(params.permissionId))) return status(404, permissionNotFound);
      if (!(await requireAssignmentOwner("role", params.roleId)))
        return status(404, assignmentOwnerNotFound);
      await permissionService.removeRole(params.roleId, params.permissionId);
      return { success: true };
    },
    {
      params: RolePermissionParamsSchema,
      response: { 200: SuccessResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "移除角色权限" },
    }
  )
  .put(
    "/user-roles/:userRoleId/:permissionId",
    async ({ params, body, status }) => {
      if (!(await requirePermission(params.permissionId))) return status(404, permissionNotFound);
      if (!(await requireAssignmentOwner("userRole", params.userRoleId)))
        return status(404, assignmentOwnerNotFound);
      return UserRolePermissionResponseSchema.parse(
        serializeDates(
          await permissionService.assignUserRole(
            params.userRoleId,
            params.permissionId,
            PermissionAssignmentSchema.parse(body)
          )
        )
      );
    },
    {
      params: UserRolePermissionParamsSchema,
      body: PermissionAssignmentSchema,
      response: { 200: UserRolePermissionResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "分配用户角色权限" },
    }
  )
  .delete(
    "/user-roles/:userRoleId/:permissionId",
    async ({ params, status }) => {
      if (!(await requirePermission(params.permissionId))) return status(404, permissionNotFound);
      if (!(await requireAssignmentOwner("userRole", params.userRoleId)))
        return status(404, assignmentOwnerNotFound);
      await permissionService.removeUserRole(params.userRoleId, params.permissionId);
      return { success: true };
    },
    {
      params: UserRolePermissionParamsSchema,
      response: { 200: SuccessResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "移除用户角色权限" },
    }
  )
  .put(
    "/department-roles/:departmentRoleId/:permissionId",
    async ({ params, body, status }) => {
      if (!(await requirePermission(params.permissionId))) return status(404, permissionNotFound);
      if (!(await requireAssignmentOwner("departmentRole", params.departmentRoleId)))
        return status(404, assignmentOwnerNotFound);
      return DepartmentRolePermissionResponseSchema.parse(
        serializeDates(
          await permissionService.assignDepartmentRole(
            params.departmentRoleId,
            params.permissionId,
            PermissionAssignmentSchema.parse(body)
          )
        )
      );
    },
    {
      params: DepartmentRolePermissionParamsSchema,
      body: PermissionAssignmentSchema,
      response: {
        200: DepartmentRolePermissionResponseSchema,
        404: PermissionNotFoundResponseSchema,
      },
      detail: { tags: ["Permissions"], summary: "分配部门角色权限" },
    }
  )
  .delete(
    "/department-roles/:departmentRoleId/:permissionId",
    async ({ params, status }) => {
      if (!(await requirePermission(params.permissionId))) return status(404, permissionNotFound);
      if (!(await requireAssignmentOwner("departmentRole", params.departmentRoleId)))
        return status(404, assignmentOwnerNotFound);
      await permissionService.removeDepartmentRole(params.departmentRoleId, params.permissionId);
      return { success: true };
    },
    {
      params: DepartmentRolePermissionParamsSchema,
      response: { 200: SuccessResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "移除部门角色权限" },
    }
  )
  .get(
    "/:id",
    async ({ params, status }) => {
      const permission = await permissionService.findById(params.id);
      return permission
        ? PermissionResponseSchema.parse(serializeDates(permission))
        : status(404, permissionNotFound);
    },
    {
      params: PermissionIdSchema,
      response: { 200: PermissionResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "查询权限" },
    }
  )
  .patch(
    "/:id",
    async ({ params, body, status }) => {
      if (!(await requirePermission(params.id))) return status(404, permissionNotFound);
      return PermissionResponseSchema.parse(
        serializeDates(
          await permissionService.update(params.id, PermissionUpdateSchema.parse(body))
        )
      );
    },
    {
      params: PermissionIdSchema,
      body: PermissionUpdateSchema,
      response: { 200: PermissionResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "修改权限" },
    }
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      if (!(await requirePermission(params.id))) return status(404, permissionNotFound);
      await permissionService.softDelete(params.id);
      return { success: true };
    },
    {
      params: PermissionIdSchema,
      response: { 200: SuccessResponseSchema, 404: PermissionNotFoundResponseSchema },
      detail: { tags: ["Permissions"], summary: "删除权限" },
    }
  );
