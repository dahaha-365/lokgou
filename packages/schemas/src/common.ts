import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// ⚡ 必须在所有 schema 定义之前调用
extendZodWithOpenApi(z);

/*
export const EnableStateSchema = z
  .union([
    z.literal(0).describe("正常"),
    z.literal(1).describe("已停用"),
    z.literal(2).describe("待审核")
  ])
  .describe("状态：0-正常；1-已停用；2-待审核");

 */

export const EnableStateSchema = z
  .enum({
    Normal: 0,
    Disabled: 1,
    PendingReview: 2,
  } as const)
  .openapi({
    description: "账号状态",
    example: 0,
    // Scalar 会读取 x-enum-descriptions 来显示每个值的说明
    "x-enum-descriptions": ["正常", "已停用", "待审核"],
  })
  .default(0)
  .describe("账号状态：0-正常；1-已停用；2-待审核");

export const IdSchema = z.object({ id: z.coerce.number().int().positive() });

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ApiResponseSchema = z.object({
  code: z.string().describe("响应码"),
  message: z.string().describe("响应消息"),
  data: z.unknown().describe("响应数据"),
});

/** 路由内部仍声明业务 payload；顶层 API 框架会统一包装为 ApiResponse。 */
export const ErrorResponseSchema = z.object({
  message: z.string().describe("错误信息"),
  code: z.string().optional().describe("错误码"),
  issues: z.array(z.unknown()).optional().describe("错误描述"),
});

export const SuccessResponseSchema = z.object({ success: z.boolean() });

export type EnableState = z.infer<typeof EnableStateSchema>;
export type Id = z.infer<typeof IdSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
