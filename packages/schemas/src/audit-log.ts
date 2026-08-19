import { z } from "zod";
import { PaginationSchema } from "./common";

const PositiveIntegerSchema = z.coerce.number().int().positive();
const IsoDateTimeSchema = z.iso.datetime({ offset: true });

export const AuditLogRecordIdSchema = PositiveIntegerSchema;
export const AuditLogPathSchema = z.object({
  resource: z.string().regex(/^[a-z]+(?:-[a-z]+)*$/),
  recordId: AuditLogRecordIdSchema,
});
export const AuditLogQuerySchema = PaginationSchema.extend({
  actorId: PositiveIntegerSchema.optional(),
  method: z.enum(["POST", "PUT", "PATCH", "DELETE"]).optional(),
  action: z.enum(["create", "update", "delete"]).optional(),
  startAt: IsoDateTimeSchema.optional(),
  endAt: IsoDateTimeSchema.optional(),
});
export const AuditActorSchema = z.object({
  id: PositiveIntegerSchema,
  username: z.string(),
  name: z.string().nullable(),
  displayName: z.string(),
});
export const AuditLogResponseSchema = z.object({
  id: PositiveIntegerSchema,
  actor: AuditActorSchema,
  method: z.string(),
  action: z.string(),
  resource: z.string(),
  targetResource: z.string(),
  targetId: PositiveIntegerSchema.nullable(),
  path: z.string(),
  createdAt: IsoDateTimeSchema,
});
export const AuditLogListResponseSchema = z.object({
  items: z.array(AuditLogResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type AuditLogPath = z.infer<typeof AuditLogPathSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
