import { Elysia } from "elysia";
import { z } from "zod";
import {
  AttachmentAutoCodeRequiredResponseSchema,
  AttachmentFileNotFoundResponseSchema,
  AttachmentIdSchema,
  AttachmentListResponseSchema,
  AttachmentNotFoundResponseSchema,
  AttachmentQuerySchema,
  AttachmentResponseSchema,
  AttachmentUpdateSchema,
  AttachmentUploadSchema,
  SuccessResponseSchema,
} from "@lokgou/schemas";
import { requestLocale, t } from "../../../lib/i18n";
import { serializeDates } from "../../../lib/serialize";
import { AutoCodeRuleRequiredError } from "../system/autocode/autocode.service";
import { attachmentService, uploadAttachment } from "./attachment.service";
import { getAttachmentStoragePath } from "../../../lib/config";
import { relative, resolve, sep } from "node:path";

type AttachmentError = "ATTACHMENT_NOT_FOUND" | "ATTACHMENT_FILE_NOT_FOUND";

function error(
  request: Request,
  code: "ATTACHMENT_NOT_FOUND"
): { message: string; code: "ATTACHMENT_NOT_FOUND" };
function error(
  request: Request,
  code: "ATTACHMENT_FILE_NOT_FOUND"
): { message: string; code: "ATTACHMENT_FILE_NOT_FOUND" };
function error(request: Request, code: AttachmentError) {
  const locale = requestLocale(request.headers.get("accept-language") ?? undefined);
  return {
    message: t(
      locale,
      code === "ATTACHMENT_NOT_FOUND"
        ? "admin.attachments.notFound"
        : "admin.attachments.fileNotFound"
    ),
    code,
  };
}

const validationResponseSchema = z.object({
  message: z.string(),
  code: z.literal("VALIDATION_ERROR"),
});

function responseItem(item: Record<string, unknown>) {
  const tags = (() => {
    try {
      const parsed: unknown = JSON.parse(String(item.tags));
      return Array.isArray(parsed) && parsed.every((tag) => typeof tag === "string") ? parsed : [];
    } catch {
      return [];
    }
  })();
  const publicItem = Object.fromEntries(
    Object.entries(item).filter(([key]) => !["storageName", "storagePath", "tags"].includes(key))
  );
  return AttachmentResponseSchema.parse({ ...serializeDates(publicItem), tags });
}

function downloadPath(storagePath: string) {
  const root = resolve(getAttachmentStoragePath());
  const target = resolve(root, storagePath);
  if (relative(root, target).startsWith(`..${sep}`) || relative(root, target) === "") return null;
  return target;
}

function contentDisposition(filename: string) {
  const fallback = filename.replace(/["\\\r\n]/g, "_").replace(/[^\x20-\x7e]/g, "_") || "download";
  const encoded = encodeURIComponent(filename).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export const attachmentController = new Elysia({ prefix: "/attachments" })
  .post(
    "/",
    async ({ body, request, status }) => {
      try {
        const upload = AttachmentUploadSchema.parse(body);
        return responseItem(await uploadAttachment(upload.file, upload));
      } catch (caught) {
        if (caught instanceof AutoCodeRuleRequiredError) {
          return status(409, {
            message: t(
              requestLocale(request.headers.get("accept-language") ?? undefined),
              "admin.autocode.ruleRequired",
              "ATTACHMENT"
            ),
            code: "AUTOCODE_RULE_REQUIRED",
          });
        }
        throw caught;
      }
    },
    {
      body: AttachmentUploadSchema,
      response: {
        200: AttachmentResponseSchema,
        409: AttachmentAutoCodeRequiredResponseSchema,
        422: validationResponseSchema,
      },
      detail: { tags: ["Attachments"], summary: "上传附件" },
    }
  )
  .get(
    "/",
    async ({ query }) => {
      const result = await attachmentService.list(AttachmentQuerySchema.parse(query));
      return AttachmentListResponseSchema.parse({
        ...result,
        items: result.items.map(responseItem),
      });
    },
    {
      query: AttachmentQuerySchema,
      response: { 200: AttachmentListResponseSchema },
      detail: { tags: ["Attachments"], summary: "附件列表" },
    }
  )
  .get(
    "/:id",
    async ({ params, request, status }) => {
      const item = await attachmentService.findById(params.id);
      return item ? responseItem(item) : status(404, error(request, "ATTACHMENT_NOT_FOUND"));
    },
    {
      params: AttachmentIdSchema,
      response: { 200: AttachmentResponseSchema, 404: AttachmentNotFoundResponseSchema },
      detail: { tags: ["Attachments"], summary: "查询附件" },
    }
  )
  .patch(
    "/:id",
    async ({ params, body, request, status }) => {
      const result = await attachmentService.update(params.id, AttachmentUpdateSchema.parse(body));
      return "failure" in result
        ? status(404, error(request, result.failure!))
        : responseItem(result.item);
    },
    {
      params: AttachmentIdSchema,
      body: AttachmentUpdateSchema,
      response: { 200: AttachmentResponseSchema, 404: AttachmentNotFoundResponseSchema },
      detail: { tags: ["Attachments"], summary: "修改附件" },
    }
  )
  .get(
    "/:id/download",
    async ({ params, request, set, status }) => {
      const item = await attachmentService.findById(params.id);
      if (!item) return status(404, error(request, "ATTACHMENT_NOT_FOUND"));
      const path = downloadPath(item.storagePath);
      if (!path || !(await Bun.file(path).exists()))
        return status(404, error(request, "ATTACHMENT_FILE_NOT_FOUND"));
      set.headers["content-disposition"] = contentDisposition(item.originalName);
      return Bun.file(path, { type: item.mimeType });
    },
    {
      params: AttachmentIdSchema,
      response: {
        200: z.any(),
        404: AttachmentNotFoundResponseSchema.or(AttachmentFileNotFoundResponseSchema),
      },
      detail: { tags: ["Attachments"], summary: "下载附件" },
    }
  )
  .delete(
    "/:id",
    async ({ params, request, status }) => {
      const result = await attachmentService.softDelete(params.id);
      return "failure" in result ? status(404, error(request, result.failure!)) : { success: true };
    },
    {
      params: AttachmentIdSchema,
      response: { 200: SuccessResponseSchema, 404: AttachmentNotFoundResponseSchema },
      detail: { tags: ["Attachments"], summary: "删除附件" },
    }
  );
