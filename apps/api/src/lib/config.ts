import { config } from "dotenv";

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
