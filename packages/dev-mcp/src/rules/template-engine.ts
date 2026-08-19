import type { TaskIntent } from "./intent-classifier";
import type { CompletedTaskPhase, TaskPhase } from "../router";

const reassessmentInstruction =
  "After completing your current work, reassess the next work and assign the suitable role for it.";

export function implementationPrompt(intent: TaskIntent, task: string, context: string): string {
  return `You are the lokgou bounded coding worker. Implement only this bounded task: ${task}\n\nIntent: ${intent}\n\nSelected context:\n${context}\n\nUse the listed paths to load local details when needed; do not assume omitted context is absent. Do not make architecture, security, Prisma, public API, AutoCode, i18n, dependency, or other high-risk decisions; report them for orchestrator review. Return a concise implementation plan, affected files, and verification commands. Do not invent framework APIs. ${reassessmentInstruction}`;
}

export function planningPrompt(intent: TaskIntent, task: string, context: string): string {
  return `You are the lokgou development orchestrator. Analyze this task: ${task}\n\nIntent: ${intent}\n\nSelected context:\n${context}\n\nLoad local details only from listed paths and load only the relevant official sources. Decide the smallest correct design, define coder scope, acceptance criteria, risks, documentation updates, and verification. Retain security, Prisma, public API, AutoCode, i18n, and architecture decisions. ${reassessmentInstruction}`;
}

export function validationPrompt(intent: TaskIntent, task: string, context: string): string {
  return `You are the lokgou validation worker. Inspect the supplied plan or task for rule compliance: ${task}\n\nIntent: ${intent}\n\nSelected context:\n${context}\n\nReport defects only. Load the listed files only when necessary. Do not implement changes or make architecture, security, Prisma, public API, AutoCode, i18n, or dependency decisions. ${reassessmentInstruction}`;
}

export function reassessmentPrompt(
  intent: TaskIntent,
  task: string,
  context: string,
  completedPhase: CompletedTaskPhase,
  outcome: string
): string {
  return `You are the lokgou reassessment validator. Reassess the original task after completed work.\n\nOriginal task: ${task}\n\nCompleted phase: ${completedPhase}\n\nOutcome:\n${outcome}\n\nIntent: ${intent}\n\nSelected context:\n${context}\n\nDecide the next phase (planning, implementation, validation, or no further work), the suitable role (orchestrator, code-gen, or validator), whether orchestrator review is required, and why. Return a JSON object with nextPhase, recommendedRole, requiresOrchestratorReview, and reason. Do not automatically escalate to the orchestrator; recommend it only when the remaining work needs its review. ${reassessmentInstruction}`;
}

export function promptForPhase(
  phase: TaskPhase,
  intent: TaskIntent,
  task: string,
  context: string,
  reassessment?: { completedPhase: CompletedTaskPhase; outcome: string }
): string {
  switch (phase) {
    case "planning":
      return planningPrompt(intent, task, context);
    case "validation":
      return validationPrompt(intent, task, context);
    case "reassessment":
      if (!reassessment) {
        throw new Error("Reassessment requires a completed phase and outcome.");
      }
      return reassessmentPrompt(
        intent,
        task,
        context,
        reassessment.completedPhase,
        reassessment.outcome
      );
    case "implementation":
      return implementationPrompt(intent, task, context);
  }
}
