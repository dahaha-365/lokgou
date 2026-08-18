import { z } from "zod";

export const DepartmentLeaderRoleSchema = z.enum(["primary", "deputy"]);

export const DepartmentLeaderCreateSchema = z.object({
  userId: z.string().min(1),
  departmentId: z.string().min(1),
  role: DepartmentLeaderRoleSchema.default("primary"),
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }).nullable(),
});

export const DepartmentLeaderUpdateSchema = DepartmentLeaderCreateSchema.partial();
export const DepartmentLeaderIdSchema = z.object({ id: z.string().min(1) });

export const DepartmentLeaderQuerySchema = z.object({
  departmentId: z.string().optional(),
  userId: z.string().optional(),
  role: DepartmentLeaderRoleSchema.optional(),
});

export const DepartmentLeaderResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  departmentId: z.string(),
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
