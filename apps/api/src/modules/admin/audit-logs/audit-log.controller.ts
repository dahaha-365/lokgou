import {
  AuditLogListResponseSchema,
  AuditLogPathSchema,
  AuditLogQuerySchema,
} from "@lokgou/schemas";
import { Elysia } from "elysia";
import { auditLogResponse, listRecordOperations } from "./audit-log.service";

export const auditLogController = new Elysia({ prefix: "/audit-logs" }).get(
  "/:resource/:recordId",
  async ({ params, query }) => {
    const path = AuditLogPathSchema.parse(params);
    const result = await listRecordOperations({
      ...path,
      query: AuditLogQuerySchema.parse(query),
    });
    return AuditLogListResponseSchema.parse({
      ...result,
      items: result.items.map(auditLogResponse),
    });
  },
  {
    params: AuditLogPathSchema,
    query: AuditLogQuerySchema,
    response: { 200: AuditLogListResponseSchema },
    detail: { tags: ["Audit Logs"], summary: "查询资源审计日志" },
  }
);
