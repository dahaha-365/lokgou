import { z } from "zod";
import { EnableStateSchema } from "./common";

export const PositionCreateSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  enableState: EnableStateSchema.default(0),
});
export const PositionUpdateSchema = PositionCreateSchema.partial();
export const PositionIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const PositionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  name: z.string().trim().optional(),
  enableState: z.coerce.number().int().optional(),
});
export const PositionResponseSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enableState: EnableStateSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});
export const PositionNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("POSITION_NOT_FOUND"),
});
export const PositionListResponseSchema = z.object({
  items: z.array(PositionResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type PositionCreate = z.infer<typeof PositionCreateSchema>;
export type PositionUpdate = z.infer<typeof PositionUpdateSchema>;
export type PositionQuery = z.infer<typeof PositionQuerySchema>;
export type PositionResponse = z.infer<typeof PositionResponseSchema>;
export type PositionNotFoundResponse = z.infer<typeof PositionNotFoundResponseSchema>;
export type PositionListResponse = z.infer<typeof PositionListResponseSchema>;
