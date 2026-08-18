import { z } from "zod";

export const AdminLoginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(8).max(128),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});

export const SessionIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const SessionResponseSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});

export const SessionListResponseSchema = z.array(SessionResponseSchema);

export const AuthUnauthorizedResponseSchema = z.object({
  message: z.string(),
  code: z.literal("AUTH_UNAUTHORIZED"),
});
