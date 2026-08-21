import { projectContext } from "./project";
import type { RoutePlan, TaskPhase } from "./router";
import { searchLocal } from "./indexer/search";

export type ContextLevel = "minimal" | "standard" | "full";

export function defaultContextLevel(phase: TaskPhase): ContextLevel {
  return phase === "planning" ? "standard" : "minimal";
}

function overlaps(path: string, target: string): boolean {
  return path === target || path.startsWith(`${target}/`) || target.startsWith(`${path}/`);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function buildModelContext(
  plan: RoutePlan,
  level: ContextLevel,
  paths: string[] = []
): Promise<Record<string, unknown>> {
  const suppliedPaths = unique(paths);
  const planContext = {
    intent: plan.intent,
    phase: plan.phase,
    modules: plan.modules,
    officialContext: plan.officialContext,
    ...(suppliedPaths.length ? { paths: suppliedPaths } : {}),
  };
  const retrieval = await searchLocal(
    planContext.intent,
    suppliedPaths.length ? suppliedPaths : plan.modules
  );
  if (level === "minimal") return { plan: planContext, retrieval };

  const project = projectContext();
  if (level === "full") return { plan: planContext, project, retrieval };

  const relevantPaths = [...plan.modules, ...suppliedPaths];
  const modules = project.modules.filter((module) =>
    relevantPaths.some((path) => overlaps(path, module.path))
  );
  const rules = project.rules.filter(
    (rule) =>
      rule.includes("Run bun run quality") ||
      (plan.officialContext.includes("AutoCode") && rule.includes("AutoCode")) ||
      (plan.intent === "api" && rule.includes("locale"))
  );
  return { plan: planContext, project: { modules, rules }, retrieval };
}
