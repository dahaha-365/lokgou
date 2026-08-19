import { z } from "zod";
import { PaginationSchema } from "./common";

const PositiveIntegerSchema = z.coerce.number().int().positive();
const IsoDateTimeSchema = z.iso.datetime({ offset: true });

export const AttachmentIdSchema = z.object({ id: PositiveIntegerSchema });
export const AttachmentTagSchema = z.string().trim().min(1).max(50);
export const AttachmentMetadataSchema = z.object({
  category: z.string().trim().min(1).max(100).nullable().optional(),
  tags: z.array(AttachmentTagSchema).max(20).default([]),
});
export const AttachmentUploadSchema = AttachmentMetadataSchema.extend({
  file: z.file().min(1),
});
export const AttachmentUpdateSchema = AttachmentMetadataSchema.partial();
export const AttachmentQuerySchema = PaginationSchema.extend({
  keyword: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  tag: AttachmentTagSchema.optional(),
});
export const AttachmentResponseSchema = z.object({
  id: z.number().int().positive(),
  code: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  category: z.string().nullable(),
  tags: z.array(AttachmentTagSchema),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  deletedAt: IsoDateTimeSchema.nullable(),
});
export const AttachmentListResponseSchema = z.object({
  items: z.array(AttachmentResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export const AttachmentNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("ATTACHMENT_NOT_FOUND"),
});
export const AttachmentFileNotFoundResponseSchema = z.object({
  message: z.string(),
  code: z.literal("ATTACHMENT_FILE_NOT_FOUND"),
});
export const AttachmentAutoCodeRequiredResponseSchema = z.object({
  message: z.string(),
  code: z.literal("AUTOCODE_RULE_REQUIRED"),
});

export type AttachmentMetadata = z.infer<typeof AttachmentMetadataSchema>;
export type AttachmentUpdate = z.infer<typeof AttachmentUpdateSchema>;
export type AttachmentQuery = z.infer<typeof AttachmentQuerySchema>;
