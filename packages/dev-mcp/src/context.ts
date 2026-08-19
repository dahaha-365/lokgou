import { projectContext } from "./project";
import type { RoutePlan, TaskPhase } from "./router";

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

export function buildModelContext(
  plan: RoutePlan,
  level: ContextLevel,
  paths: string[] = []
): Record<string, unknown> {
  const suppliedPaths = unique(paths);
  const planContext = {
    intent: plan.intent,
    phase: plan.phase,
    modules: plan.modules,
    officialContext: plan.officialContext,
    ...(suppliedPaths.length ? { paths: suppliedPaths } : {}),
  };
  if (level === "minimal") return { plan: planContext };

  const project = projectContext();
  if (level === "full") return { plan: planContext, project };

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
  return { plan: planContext, project: { modules, rules } };
}
