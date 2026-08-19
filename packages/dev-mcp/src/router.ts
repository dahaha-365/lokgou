import { classifyIntent, type TaskIntent } from "./rules/intent-classifier";

export type TaskPhase = "planning" | "implementation" | "validation" | "reassessment";
export type CompletedTaskPhase = Exclude<TaskPhase, "reassessment">;

export type RoutePlan = {
  intent: TaskIntent;
  phase: TaskPhase;
  recommendedRole: "orchestrator" | "code-gen" | "validator";
  model: "large" | "small";
  requiresOrchestratorReview: boolean;
  reason: string;
  modules: string[];
  officialContext: string[];
};

const moduleContext: Record<TaskIntent, { modules: string[]; officialContext: string[] }> = {
  architecture: {
    modules: ["AGENTS.md", ".ai/full-llms.txt"],
    officialContext: ["Bun", "Elysia", "Prisma", "Zod"],
  },
  security: {
    modules: ["apps"],
    officialContext: ["Bun", "Elysia", "Prisma", "Zod"],
  },
  database: {
    modules: ["apps/api/prisma/schema.prisma", "apps/api/prisma/seed.ts"],
    officialContext: ["Prisma", "Faker"],
  },
  api: {
    modules: ["packages/schemas/src", "apps/api/src/modules", "apps/api/src/app.ts"],
    officialContext: ["Elysia", "Zod", "Scalar"],
  },
  frontend: { modules: ["apps"], officialContext: ["Bun"] },
  documentation: { modules: ["docs/dev", "docs/user"], officialContext: [] },
  coding: { modules: ["AGENTS.md"], officialContext: [] },
};

export function routeTask(
  task: string,
  paths: string[] = [],
  phase: TaskPhase = "implementation"
): RoutePlan {
  const intent = classifyIntent(`${task} ${paths.join(" ")}`);
  const requiresOrchestratorReview = ["architecture", "security", "database", "api"].includes(
    intent
  );
  const context = moduleContext[intent];
  const recommendedRole =
    phase === "planning" ? "orchestrator" : phase === "implementation" ? "code-gen" : "validator";
  const model = phase === "planning" ? "large" : "small";
  const phaseReason =
    phase === "planning"
      ? "Planning requires the orchestrator to define the design and delegation scope."
      : phase === "validation"
        ? "Validation requires the validator to inspect the supplied plan or task for rule compliance."
        : phase === "reassessment"
          ? "Reassessment requires the validator to decide the next phase, role, and need for orchestrator review from completed work."
          : "Implementation is a bounded coding task for the code-gen worker.";

  return {
    intent,
    phase,
    recommendedRole,
    model,
    requiresOrchestratorReview,
    reason: requiresOrchestratorReview
      ? `${phaseReason} High-risk decisions and final integration require orchestrator review, but bounded implementation is code-gen.`
      : phaseReason,
    modules: context.modules,
    officialContext: context.officialContext,
  };
}
