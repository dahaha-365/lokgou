import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: new URL("../../.env", import.meta.url) });

function routePrefix(value: string | undefined, fallback: string): string {
  const prefix = value?.trim() || fallback;
  return `/${prefix.replace(/^\/+|\/+$/g, "")}`;
}

export const adminPrefix = routePrefix(process.env.ADMIN_PREFIX, "admin");

export function getAdminAppKey(): string | undefined {
  return process.env.ADMIN_APP_KEY;
}

export function getJwtSecret(): string | undefined {
  return process.env.JWT_SECRET;
}

export function getAdminAuthorizationHeader(): string {
  return process.env.ADMIN_AUTHORIZATION_HEADER?.trim().toLowerCase() || "admin-authorization";
}

export function getAttachmentStoragePath(): string {
  return resolve(
    process.cwd(),
    process.env.ATTACHMENT_STORAGE_PATH?.trim() || "storage/attachments"
  );
}

export function getAttachmentMaxSize(): number {
  const value = process.env.ATTACHMENT_MAX_SIZE?.trim();
  if (!value) return 10 * 1024 * 1024;
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 1 || size > 2_147_483_647)
    throw new Error("ATTACHMENT_MAX_SIZE must be an integer between 1 and 2147483647.");
  return size;
}

/**
 * Comma-separated MIME types. Exact types and major-type wildcards, such as image/*,
 * are supported. An empty value or * permits all types.
 */
export function getAttachmentAllowedMimeTypes(): string[] {
  const value = process.env.ATTACHMENT_ALLOWED_MIME_TYPES?.trim();
  if (!value) return ["*"];
  return value
    .split(",")
    .map((mimeType) => mimeType.trim().toLowerCase())
    .filter(Boolean);
}
