import { z } from "zod";
import { EnableStateSchema, IdSchema, PaginationSchema } from "./common";

const PermissionSchema = z.string().trim().min(1);
export const PermissionsSchema = z.array(PermissionSchema).superRefine((values, ctx) => {
  if (new Set(values).size !== values.length)
    ctx.addIssue({ code: "custom", message: "Permissions must not contain duplicates" });
});

export const RoleCreateSchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  permissions: PermissionsSchema.default([]),
  enableState: EnableStateSchema.default(0),
});
export const RoleUpdateSchema = RoleCreateSchema.partial();
export const RoleIdSchema = IdSchema;
export const RoleQuerySchema = PaginationSchema.extend({
  keyword: z.string().trim().optional(),
  enableState: z.coerce.number().int().optional(),
});
export const RoleResponseSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: PermissionsSchema,
  enableState: EnableStateSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export const RoleListResponseSchema = z.object({
  items: z.array(RoleResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const RoleUserParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});
export const RoleDepartmentParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  departmentId: z.coerce.number().int().positive(),
});
export const RoleDepartmentUserParamsSchema = RoleDepartmentParamsSchema.extend({
  userId: z.coerce.number().int().positive(),
});
export const DepartmentRoleConfigureSchema = z.object({
  grantedPermissions: PermissionsSchema.optional(),
  revokedPermissions: PermissionsSchema.optional(),
});
export const UserDepartmentRoleAssignSchema = z.object({
  startedAt: z.iso.datetime({ offset: true }).optional(),
});
export const UserRoleResponseSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const DepartmentRoleResponseSchema = z.object({
  id: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  grantedPermissions: PermissionsSchema,
  revokedPermissions: PermissionsSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export const UserDepartmentRoleResponseSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  departmentRoleId: z.number().int().positive(),
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

const notFound = <T extends string>(code: T) =>
  z.object({ message: z.string(), code: z.literal(code) });
export const RoleNotFoundResponseSchema = notFound("ROLE_NOT_FOUND");
export const RoleUserNotFoundResponseSchema = notFound("USER_NOT_FOUND");
export const RoleDepartmentNotFoundResponseSchema = notFound("DEPARTMENT_NOT_FOUND");
export const DepartmentRoleNotFoundResponseSchema = notFound("DEPARTMENT_ROLE_NOT_FOUND");
export const UserDepartmentRoleNotFoundResponseSchema = notFound("USER_DEPARTMENT_ROLE_NOT_FOUND");

export type RoleCreate = z.infer<typeof RoleCreateSchema>;
export type RoleUpdate = z.infer<typeof RoleUpdateSchema>;
export type RoleQuery = z.infer<typeof RoleQuerySchema>;
export type DepartmentRoleConfigure = z.infer<typeof DepartmentRoleConfigureSchema>;
export type UserDepartmentRoleAssign = z.infer<typeof UserDepartmentRoleAssignSchema>;
