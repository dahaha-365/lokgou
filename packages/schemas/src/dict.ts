import { z } from "zod";
import { EnableStateSchema, PaginationSchema } from "./common";

const PositiveIntegerSchema = z.coerce.number().int().positive();
const IsoDateTimeSchema = z.iso.datetime({ offset: true });

export const DictCodeSchema = z.string().trim().min(1).max(100);
export const DictCreateSchema = z.object({
  code: DictCodeSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500).nullable().optional(),
  enableState: EnableStateSchema.default(0),
});
export const DictUpdateSchema = DictCreateSchema.omit({ code: true }).partial();
export const DictIdSchema = z.object({ id: PositiveIntegerSchema });
export const DictQuerySchema = PaginationSchema.extend({
  keyword: z.string().trim().max(100).optional(),
  enableState: z.coerce.number().int().optional(),
});
export const DictResponseSchema = z.object({
  id: z.number().int().positive(),
  code: DictCodeSchema,
  name: z.string(),
  description: z.string().nullable(),
  enableState: EnableStateSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  deletedAt: IsoDateTimeSchema.nullable(),
});
export const DictListResponseSchema = z.object({
  items: z.array(DictResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const DictItemCreateSchema = z.object({
  label: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(100),
  sortOrder: z.coerce.number().int().default(0),
  description: z.string().trim().min(1).max(500).nullable().optional(),
  enableState: EnableStateSchema.default(0),
});
export const DictItemUpdateSchema = DictItemCreateSchema.partial();
export const DictItemParamsSchema = z.object({
  id: PositiveIntegerSchema,
  itemId: PositiveIntegerSchema,
});
export const DictItemQuerySchema = PaginationSchema.extend({
  keyword: z.string().trim().max(100).optional(),
  enableState: z.coerce.number().int().optional(),
});
export const DictItemResponseSchema = z.object({
  id: z.number().int().positive(),
  dictId: z.number().int().positive(),
  label: z.string(),
  value: z.string(),
  sortOrder: z.number().int(),
  description: z.string().nullable(),
  enableState: EnableStateSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  deletedAt: IsoDateTimeSchema.nullable(),
});
export const DictItemListResponseSchema = z.object({
  items: z.array(DictItemResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const DictNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("DICT_NOT_FOUND"),
});
export const DictItemNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("DICT_ITEM_NOT_FOUND"),
});
export const DictHasItemsResponseSchema = z.object({
  message: z.string(),
  code: z.literal("DICT_HAS_ITEMS"),
});

export type DictCreate = z.infer<typeof DictCreateSchema>;
export type DictUpdate = z.infer<typeof DictUpdateSchema>;
export type DictQuery = z.infer<typeof DictQuerySchema>;
export type DictItemCreate = z.infer<typeof DictItemCreateSchema>;
export type DictItemUpdate = z.infer<typeof DictItemUpdateSchema>;
export type DictItemQuery = z.infer<typeof DictItemQuerySchema>;
