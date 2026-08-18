import { z } from "zod";

export const AutoCodeRuleKeySchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const AutoCodeRuleCreateSchema = z.object({
  key: AutoCodeRuleKeySchema.describe("业务键，例如 USERNAME 或 DEPARTMENT_CODE"),
  prefix: z.string().min(1).max(30),
  middleTemplate: z.string().max(100).default(""),
  counterLength: z.number().int().min(1).max(12),
  remark: z.string().min(1).max(500),
});

export const AutoCodeRuleUpdateSchema = AutoCodeRuleCreateSchema.omit({ key: true }).partial();
export const AutoCodeRuleIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const AutoCodeRuleResponseSchema = z.object({
  id: z.number().int().positive(),
  key: AutoCodeRuleKeySchema,
  prefix: z.string(),
  middleTemplate: z.string(),
  counterLength: z.number().int().positive(),
  remark: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

export const AutoCodeRuleListResponseSchema = z.array(AutoCodeRuleResponseSchema);
export const AutoCodeRuleRequiredResponseSchema = z.object({
  message: z.string(),
  code: z.literal("AUTOCODE_RULE_REQUIRED"),
});

export type AutoCodeRuleCreate = z.infer<typeof AutoCodeRuleCreateSchema>;
export type AutoCodeRuleUpdate = z.infer<typeof AutoCodeRuleUpdateSchema>;
