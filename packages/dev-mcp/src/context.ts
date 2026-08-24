import type { RoutePlan, TaskPhase } from "./router";
import { searchLocal } from "./indexer/search";

export type ContextLevel = "minimal" | "standard" | "full";

export function defaultContextLevel(phase: TaskPhase): ContextLevel {
  return phase === "planning" ? "standard" : "minimal";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function buildModelContext(
  plan: RoutePlan,
  level: ContextLevel,
  paths: string[] = [],
  task = ""
): Promise<Record<string, unknown>> {
  const suppliedPaths = unique(paths);
  const retrieval = await searchLocal(
    `${task} ${plan.intent}`,
    suppliedPaths.length ? suppliedPaths : plan.modules
  );
  // Retrieval is deliberately the only expandable part of model context.
  // Context level changes metadata detail, never the amount of source text.
  return {
    plan: {
      intent: plan.intent,
      phase: plan.phase,
      paths: unique([...plan.modules, ...suppliedPaths]),
      officialContext: level === "minimal" ? [] : plan.officialContext,
    },
    retrieval,
  };
}
