import { createIdentifier, resolveIdentifierMiddle } from "@api/lib/identifier";
import { prisma } from "@api/lib/prisma";
import type { AutoCodeRuleCreate, AutoCodeRuleUpdate } from "@lokgou/schemas";

export class AutoCodeRuleRequiredError extends Error {
  constructor(key: string) {
    super(`自动编码规则 ${key} 未配置`);
  }
}

export const autoCodeService = {
  createRule(data: AutoCodeRuleCreate) {
    return prisma.autoCodeRule.create({ data });
  },

  listRules() {
    return prisma.autoCodeRule.findMany({ orderBy: { key: "asc" } });
  },

  updateRule(id: number, data: AutoCodeRuleUpdate) {
    return prisma.autoCodeRule.update({ where: { id }, data });
  },

  deleteRule(id: number) {
    return prisma.autoCodeRule.delete({ where: { id } });
  },

  generate(key: string, date?: Date) {
    return prisma.$transaction(async (tx) => {
      const rule = await tx.autoCodeRule.findUnique({ where: { key } });
      if (!rule) throw new AutoCodeRuleRequiredError(key);

      const middle = resolveIdentifierMiddle(rule.middleTemplate, date);
      const counter = await tx.autoCodeCounter.upsert({
        where: { ruleId_middle: { ruleId: rule.id, middle } },
        create: { ruleId: rule.id, middle, value: 1 },
        update: { value: { increment: 1 } },
      });
      return createIdentifier({
        prefix: rule.prefix,
        middle,
        counter: counter.value,
        length: rule.counterLength,
      });
    });
  },
};
