import { describe, expect, test } from "bun:test";
import { routeTask } from "./router";

describe("routeTask", () => {
  test("routes Prisma implementation work to code-gen with orchestrator review", () => {
    const route = routeTask("Add a Prisma migration for user preferences");
    expect(route).toMatchObject({
      intent: "database",
      phase: "implementation",
      recommendedRole: "code-gen",
      model: "small",
      requiresOrchestratorReview: true,
    });
    expect(route.officialContext).toContain("Prisma");
  });

  test("routes security implementation to code-gen with small model and review", () => {
    expect(routeTask("Review authentication and secrets handling")).toMatchObject({
      intent: "security",
      phase: "implementation",
      recommendedRole: "code-gen",
      model: "small",
      requiresOrchestratorReview: true,
      modules: ["apps"],
    });
  });

  test("routes planning to the orchestrator and large model", () => {
    expect(routeTask("Design an authentication flow", [], "planning")).toMatchObject({
      intent: "security",
      phase: "planning",
      recommendedRole: "orchestrator",
      model: "large",
      requiresOrchestratorReview: true,
    });
  });

  test("routes validation to the validator and small model", () => {
    expect(routeTask("Update user documentation", [], "validation")).toMatchObject({
      intent: "documentation",
      phase: "validation",
      recommendedRole: "validator",
      model: "small",
      requiresOrchestratorReview: false,
    });
  });

  test("routes reassessment to the validator and small model", () => {
    expect(routeTask("Update user documentation", [], "reassessment")).toMatchObject({
      intent: "documentation",
      phase: "reassessment",
      recommendedRole: "validator",
      model: "small",
      requiresOrchestratorReview: false,
    });
  });
});
