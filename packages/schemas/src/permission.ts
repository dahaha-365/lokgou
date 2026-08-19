import { z } from "zod";
import { EnableStateSchema, PaginationSchema } from "./common";

const PositiveIntegerSchema = z.coerce.number().int().positive();
const IsoDateTimeSchema = z.iso.datetime({ offset: true });

export const PermissionCategorySchema = z.enum(["menu", "route", "api", "button", "data"]);
export const PermissionActionSchema = z.enum([
  "read",
  "create",
  "update",
  "delete",
  "manage",
  "access",
]);
export const PermissionScopeSchema = z.enum(["all", "owner", "manager"]);
export const PermissionEffectSchema = z.enum(["allow", "deny"]);

export const PermissionCreateSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  category: PermissionCategorySchema,
  action: PermissionActionSchema,
  subject: z.string().trim().min(1).max(100),
  scope: PermissionScopeSchema.default("all"),
  enableState: EnableStateSchema,
});

export const PermissionUpdateSchema = PermissionCreateSchema.partial();

export const PermissionIdSchema = z.object({
  id: PositiveIntegerSchema,
});

export const PermissionQuerySchema = PaginationSchema.extend({
  keyword: z.string().trim().optional(),
  category: PermissionCategorySchema.optional(),
  action: PermissionActionSchema.optional(),
  subject: z.string().trim().optional(),
  scope: PermissionScopeSchema.optional(),
  enableState: z.coerce.number().int().optional(),
});

export const PermissionResponseSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  category: PermissionCategorySchema,
  action: PermissionActionSchema,
  subject: z.string(),
  scope: PermissionScopeSchema,
  enableState: EnableStateSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  deletedAt: IsoDateTimeSchema.nullable(),
});

export const PermissionListResponseSchema = z.object({
  items: z.array(PermissionResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const PermissionAssignmentSchema = z.object({
  effect: PermissionEffectSchema,
});

export const UserPermissionParamsSchema = z.object({
  userId: PositiveIntegerSchema,
  permissionId: PositiveIntegerSchema,
});

export const RolePermissionParamsSchema = z.object({
  roleId: PositiveIntegerSchema,
  permissionId: PositiveIntegerSchema,
});

export const DepartmentRolePermissionParamsSchema = z.object({
  departmentRoleId: PositiveIntegerSchema,
  permissionId: PositiveIntegerSchema,
});

export const UserRolePermissionParamsSchema = z.object({
  userRoleId: PositiveIntegerSchema,
  permissionId: PositiveIntegerSchema,
});

const PermissionAssignmentResponseSchema = z.object({
  id: z.number().int().positive(),
  permissionId: z.number().int().positive(),
  effect: PermissionEffectSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const UserPermissionResponseSchema = PermissionAssignmentResponseSchema.extend({
  userId: z.number().int().positive(),
});

export const RolePermissionResponseSchema = PermissionAssignmentResponseSchema.extend({
  roleId: z.number().int().positive(),
});

export const DepartmentRolePermissionResponseSchema = PermissionAssignmentResponseSchema.extend({
  departmentRoleId: z.number().int().positive(),
});

export const UserRolePermissionResponseSchema = PermissionAssignmentResponseSchema.extend({
  userRoleId: z.number().int().positive(),
});

export const EffectivePermissionResponseSchema = z.object({
  code: z.string(),
  category: PermissionCategorySchema,
  action: PermissionActionSchema,
  subject: z.string(),
  scope: PermissionScopeSchema,
  effect: PermissionEffectSchema,
  source: z.enum(["user", "userRole", "departmentRole", "role"]),
});
export const EffectivePermissionListResponseSchema = z.array(EffectivePermissionResponseSchema);

export const PermissionNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("PERMISSION_NOT_FOUND"),
});

export const PermissionForbiddenResponseSchema = z.object({
  message: z.string(),
  code: z.literal("PERMISSION_FORBIDDEN"),
});

export type PermissionCategory = z.infer<typeof PermissionCategorySchema>;
export type PermissionAction = z.infer<typeof PermissionActionSchema>;
export type PermissionScope = z.infer<typeof PermissionScopeSchema>;
export type PermissionEffect = z.infer<typeof PermissionEffectSchema>;
export type PermissionCreate = z.infer<typeof PermissionCreateSchema>;
export type PermissionUpdate = z.infer<typeof PermissionUpdateSchema>;
export type PermissionQuery = z.infer<typeof PermissionQuerySchema>;
export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;
export type PermissionListResponse = z.infer<typeof PermissionListResponseSchema>;
export type PermissionAssignment = z.infer<typeof PermissionAssignmentSchema>;
export type UserPermissionParams = z.infer<typeof UserPermissionParamsSchema>;
export type RolePermissionParams = z.infer<typeof RolePermissionParamsSchema>;
export type DepartmentRolePermissionParams = z.infer<typeof DepartmentRolePermissionParamsSchema>;
export type UserRolePermissionParams = z.infer<typeof UserRolePermissionParamsSchema>;
export type UserPermissionResponse = z.infer<typeof UserPermissionResponseSchema>;
export type RolePermissionResponse = z.infer<typeof RolePermissionResponseSchema>;
export type DepartmentRolePermissionResponse = z.infer<
  typeof DepartmentRolePermissionResponseSchema
>;
export type UserRolePermissionResponse = z.infer<typeof UserRolePermissionResponseSchema>;
export type EffectivePermissionResponse = z.infer<typeof EffectivePermissionResponseSchema>;
export type PermissionNotFoundResponse = z.infer<typeof PermissionNotFoundResponseSchema>;
export type PermissionForbiddenResponse = z.infer<typeof PermissionForbiddenResponseSchema>;
