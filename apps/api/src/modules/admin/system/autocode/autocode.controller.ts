import {
  AutoCodeRuleCreateSchema,
  AutoCodeRuleIdSchema,
  AutoCodeRuleListResponseSchema,
  AutoCodeRuleResponseSchema,
  AutoCodeRuleUpdateSchema,
  SuccessResponseSchema,
} from "@lokgou/schemas";
import { Elysia } from "elysia";
import { serializeDates, serializeDatesArray } from "@api/lib/serialize";
import { autoCodeService } from "./autocode.service";

export const autoCodeController = new Elysia({ prefix: "/autocode" })
  .post(
    "/rules",
    async ({ body }) =>
      AutoCodeRuleResponseSchema.parse(
        serializeDates(await autoCodeService.createRule(AutoCodeRuleCreateSchema.parse(body)))
      ),
    {
      body: AutoCodeRuleCreateSchema,
      response: AutoCodeRuleResponseSchema,
      detail: { tags: ["System / AutoCode"], summary: "新增自动编码规则" },
    }
  )
  .get(
    "/rules",
    async () =>
      AutoCodeRuleListResponseSchema.parse(serializeDatesArray(await autoCodeService.listRules())),
    {
      response: AutoCodeRuleListResponseSchema,
      detail: { tags: ["System / AutoCode"], summary: "自动编码规则列表" },
    }
  )
  .patch(
    "/rules/:id",
    async ({ params, body }) =>
      AutoCodeRuleResponseSchema.parse(
        serializeDates(
          await autoCodeService.updateRule(params.id, AutoCodeRuleUpdateSchema.parse(body))
        )
      ),
    {
      params: AutoCodeRuleIdSchema,
      body: AutoCodeRuleUpdateSchema,
      response: AutoCodeRuleResponseSchema,
      detail: { tags: ["System / AutoCode"], summary: "修改自动编码规则" },
    }
  )
  .delete(
    "/rules/:id",
    async ({ params }) => {
      await autoCodeService.deleteRule(params.id);
      return { success: true };
    },
    {
      params: AutoCodeRuleIdSchema,
      response: SuccessResponseSchema,
      detail: { tags: ["System / AutoCode"], summary: "删除自动编码规则" },
    }
  );
