import { z } from "zod";
import { EnableStateSchema } from "./common";

export const UserCreateSchema = z.object({
  email: z.email().optional().describe("邮箱地址"),
  mobile: z.string().max(30).optional().describe("手机号"),
  username: z.string().min(1).max(50).describe("登录用户名"),
  name: z.string().max(50).optional().describe("姓名"),
  enableState: EnableStateSchema.default(0).describe("账号状态"),
  isAdmin: z.boolean().default(false),
});

export const UserUpdateSchema = UserCreateSchema.partial();

export const UserIdSchema = z.object({ id: z.string().min(1) });

export const UserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  enableState: z.coerce.number().int().optional(),
});

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.email().nullable(),
  mobile: z.string().nullable(),
  username: z.string(),
  name: z.string().nullable(),
  enableState: EnableStateSchema,
  isAdmin: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
});

export const UserNotFoundResponseSchema = z.object({
  message: z.string().describe("错误信息"),
  code: z.literal("USER_NOT_FOUND").describe("错误码"),
});

export const UserListResponseSchema = z.object({
  items: z.array(UserResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type UserNotFoundResponse = z.infer<typeof UserNotFoundResponseSchema>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
