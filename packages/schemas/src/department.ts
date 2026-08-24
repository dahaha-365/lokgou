import { z } from "zod";
import { EnableStateSchema } from "./common";

export const DepartmentCreateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100),
  enableState: EnableStateSchema.default(0),
  parentId: z.coerce.number().int().positive().nullable().optional(),
});

export const DepartmentUpdateSchema = DepartmentCreateSchema.partial();
export const DepartmentIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const DepartmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  parentId: z.coerce.number().int().positive().optional(),
  enableState: z.coerce.number().int().optional(),
});
export const DepartmentTreeQuerySchema = z.object({
  rootId: z.coerce.number().int().positive().nullable().optional(),
});

export const DepartmentResponseSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  enableState: EnableStateSchema,
  parentId: z.number().int().positive().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});

export const DepartmentNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("DEPARTMENT_NOT_FOUND"),
});

export const DepartmentListResponseSchema = z.object({
  items: z.array(DepartmentResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export const DepartmentTreeNodeSchema: z.ZodType<
  z.infer<typeof DepartmentResponseSchema> & { children: unknown[] }
> = DepartmentResponseSchema.extend({ children: z.lazy(() => z.array(DepartmentTreeNodeSchema)) });
export const DepartmentTreeResponseSchema = z.array(DepartmentTreeNodeSchema);

export type DepartmentCreate = z.infer<typeof DepartmentCreateSchema>;
export type DepartmentUpdate = z.infer<typeof DepartmentUpdateSchema>;
export type DepartmentQuery = z.infer<typeof DepartmentQuerySchema>;
export type DepartmentResponse = z.infer<typeof DepartmentResponseSchema>;
export type DepartmentNotFoundResponse = z.infer<typeof DepartmentNotFoundResponseSchema>;
export type DepartmentListResponse = z.infer<typeof DepartmentListResponseSchema>;
