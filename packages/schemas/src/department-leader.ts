import { z } from "zod";

export const DepartmentLeaderRoleSchema = z.enum(["primary", "deputy"]);

export const DepartmentLeaderCreateSchema = z.object({
  userId: z.coerce.number().int().positive(),
  departmentId: z.coerce.number().int().positive(),
  role: DepartmentLeaderRoleSchema.default("primary"),
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }).nullable(),
});

export const DepartmentLeaderUpdateSchema = DepartmentLeaderCreateSchema.partial();
export const DepartmentLeaderIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const DepartmentLeaderQuerySchema = z.object({
  departmentId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  role: DepartmentLeaderRoleSchema.optional(),
});

export const DepartmentLeaderResponseSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  role: DepartmentLeaderRoleSchema,
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const DepartmentLeaderNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("DEPARTMENT_LEADER_NOT_FOUND"),
});

export type DepartmentLeaderRole = z.infer<typeof DepartmentLeaderRoleSchema>;
export type DepartmentLeaderCreate = z.infer<typeof DepartmentLeaderCreateSchema>;
export type DepartmentLeaderUpdate = z.infer<typeof DepartmentLeaderUpdateSchema>;
export type DepartmentLeaderQuery = z.infer<typeof DepartmentLeaderQuerySchema>;
export type DepartmentLeaderResponse = z.infer<typeof DepartmentLeaderResponseSchema>;
export type DepartmentLeaderNotFoundResponse = z.infer<
  typeof DepartmentLeaderNotFoundResponseSchema
>;
