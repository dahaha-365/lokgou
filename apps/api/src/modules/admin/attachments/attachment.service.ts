import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import type { AttachmentMetadata, AttachmentQuery, AttachmentUpdate } from "@lokgou/schemas";
import {
  getAttachmentAllowedMimeTypes,
  getAttachmentMaxSize,
  getAttachmentStoragePath,
} from "../../../lib/config";
import { prisma } from "../../../lib/prisma";
import { autoCodeService } from "../system/autocode/autocode.service";

export type AttachmentFailure = "ATTACHMENT_NOT_FOUND";
export type UploadAttachmentOptions = {
  category?: string | null;
  tags?: string[];
};

function normalizedTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function allowedMimeType(mimeType: string, allowedMimeTypes: string[]): boolean {
  const value = mimeType.toLowerCase();
  return allowedMimeTypes.some(
    (allowed) =>
      allowed === "*" ||
      allowed === value ||
      (allowed.endsWith("/*") && value.startsWith(allowed.slice(0, -1)))
  );
}

function safeOriginalName(name: string): string {
  const value = basename(name.replaceAll("\\", "/"))
    .replaceAll("\0", "_")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/^\.+/, "")
    .trim();
  return (
    [...value].map((character) => (character.charCodeAt(0) < 32 ? "_" : character)).join("") ||
    "file"
  );
}

function storageLocation(uploadedAt: Date, originalName: string) {
  const root = resolve(getAttachmentStoragePath());
  const datePath = [
    String(uploadedAt.getUTCFullYear()),
    String(uploadedAt.getUTCMonth() + 1).padStart(2, "0"),
    String(uploadedAt.getUTCDate()).padStart(2, "0"),
  ];
  const extension = extname(originalName)
    .replace(/[^.A-Za-z0-9]/g, "")
    .slice(0, 32);
  const storageName = `${randomUUID()}${extension}`;
  const target = resolve(root, ...datePath, storageName);

  if (relative(root, target).startsWith(`..${sep}`) || relative(root, target) === "") {
    throw new Error("Attachment storage path escapes the configured root.");
  }

  return { root, target, storageName, storagePath: `${datePath.join("/")}/${storageName}` };
}

function attachmentWhere(params: AttachmentQuery) {
  return {
    deletedAt: null,
    ...(params.keyword
      ? {
          OR: [
            { originalName: { contains: params.keyword } },
            { code: { contains: params.keyword } },
          ],
        }
      : {}),
    ...(params.category === undefined ? {} : { category: params.category }),
  };
}

function hasTag(tags: string, tag: string) {
  try {
    const parsed: unknown = JSON.parse(tags);
    return Array.isArray(parsed) && parsed.includes(tag);
  } catch {
    return false;
  }
}

export const attachmentService = {
  findById(id: number) {
    return prisma.attachment.findFirst({ where: { id, deletedAt: null } });
  },

  create(file: File, metadata: AttachmentMetadata) {
    return uploadAttachment(file, metadata);
  },

  async list(params: AttachmentQuery) {
    return prisma.$transaction(async (tx) => {
      const items = await tx.attachment.findMany({
        where: attachmentWhere(params),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const matched = params.tag ? items.filter((item) => hasTag(item.tags, params.tag!)) : items;
      return {
        items: matched.slice((params.page - 1) * params.pageSize, params.page * params.pageSize),
        page: params.page,
        pageSize: params.pageSize,
        total: matched.length,
      };
    });
  },

  async update(id: number, data: AttachmentUpdate) {
    return prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.findFirst({ where: { id, deletedAt: null } });
      if (!attachment) return { failure: "ATTACHMENT_NOT_FOUND" } as const;
      const update = {
        ...(data.category === undefined ? {} : { category: data.category }),
        ...(data.tags === undefined ? {} : { tags: JSON.stringify(normalizedTags(data.tags)) }),
      };
      return { item: await tx.attachment.update({ where: { id }, data: update }) } as const;
    });
  },

  async softDelete(id: number) {
    return prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.findFirst({ where: { id, deletedAt: null } });
      if (!attachment) return { failure: "ATTACHMENT_NOT_FOUND" } as const;
      await tx.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
      return {} as const;
    });
  },
};

/**
 * Persist an uploaded file and create its attachment metadata.
 *
 * Other business modules should call this utility rather than writing files directly.
 * It generates the ATTACHMENT business code, stores the bytes below the configured
 * YYYY/MM/DD root, and records only the internal storage reference in the database.
 */
export async function uploadAttachment(file: File, options: UploadAttachmentOptions = {}) {
  const maxSize = getAttachmentMaxSize();
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > maxSize)
    throw new RangeError(`Attachment file size must be between 1 and ${maxSize} bytes.`);

  const mimeType = file.type || "application/octet-stream";
  if (!allowedMimeType(mimeType, getAttachmentAllowedMimeTypes()))
    throw new TypeError(`Attachment MIME type ${mimeType} is not allowed.`);

  const uploadedAt = new Date();
  const originalName = safeOriginalName(file.name);
  const location = storageLocation(uploadedAt, originalName);
  const code = await autoCodeService.generate("ATTACHMENT", uploadedAt);

  try {
    await mkdir(dirname(location.target), { recursive: true });
    await Bun.write(location.target, file);
  } catch (error) {
    await unlink(location.target).catch(() => undefined);
    throw error;
  }

  try {
    return await prisma.$transaction(async (tx) =>
      tx.attachment.create({
        data: {
          code,
          originalName,
          storageName: location.storageName,
          storagePath: location.storagePath,
          mimeType,
          size: file.size,
          category: options.category ?? null,
          tags: JSON.stringify(normalizedTags(options.tags ?? [])),
        },
      })
    );
  } catch (error) {
    await unlink(location.target).catch(() => undefined);
    throw error;
  }
}
