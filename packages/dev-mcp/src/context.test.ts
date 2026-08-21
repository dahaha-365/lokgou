import { describe, expect, test } from "bun:test";
import { buildModelContext, defaultContextLevel } from "./context";
import { projectContext } from "./project";
import type { RoutePlan, TaskPhase } from "./router";

const apiPlan: RoutePlan = {
  intent: "api",
  phase: "implementation",
  recommendedRole: "code-gen",
  model: "small",
  requiresOrchestratorReview: true,
  reason: "API work requires orchestrator review.",
  modules: ["apps/api/src/modules"],
  officialContext: ["Elysia", "Zod", "Scalar"],
};

describe("defaultContextLevel", () => {
  test("uses standard context for planning and minimal context for later phases", () => {
    expect(defaultContextLevel("planning")).toBe("standard");

    for (const phase of ["implementation", "validation", "reassessment"] as TaskPhase[]) {
      expect(defaultContextLevel(phase)).toBe("minimal");
    }
  });
});

describe("buildModelContext", () => {
  test("builds minimal context from the route plan and deduplicated supplied paths", async () => {
    const context = await buildModelContext(apiPlan, "minimal", [
      "apps/api/src/modules/admin/routes.ts",
      "apps/api/src/modules/admin/routes.ts",
      "packages/schemas/src",
      "packages/schemas/src",
    ]);

    expect(context).toMatchObject({
      plan: {
        intent: "api",
        phase: "implementation",
        modules: apiPlan.modules,
        officialContext: apiPlan.officialContext,
        paths: ["apps/api/src/modules/admin/routes.ts", "packages/schemas/src"],
      },
    });
    expect(context).not.toHaveProperty("project.modules");
    expect(context).not.toHaveProperty("project.rules");
  });

  test("builds standard context with only relevant project modules and rules", async () => {
    const autoCodePlan: RoutePlan = {
      ...apiPlan,
      officialContext: [...apiPlan.officialContext, "AutoCode"],
    };
    const context = await buildModelContext(autoCodePlan, "standard", [
      "packages/schemas/src/role.ts",
    ]);

    expect(context).toMatchObject({
      plan: {
        intent: "api",
        phase: "implementation",
        modules: autoCodePlan.modules,
        officialContext: autoCodePlan.officialContext,
        paths: ["packages/schemas/src/role.ts"],
      },
    });
    expect(context).toHaveProperty("project.modules");
    expect(context).toHaveProperty("project.rules");
    expect(context).toMatchObject({
      project: {
        modules: [{ path: "apps/api" }, { path: "packages/schemas" }],
        rules: [
          "Use persisted AutoCode rules for business identifiers.",
          "Use module and locale specific runtime messages; zh-CN is the fallback.",
          "Run bun run quality after changes.",
        ],
      },
    });
    expect(context).not.toMatchObject({ project: { modules: [{ path: "docs" }] } });
  });

  test("builds full context with every project module and rule", async () => {
    const context = await buildModelContext(apiPlan, "full", [
      "apps/api/src/modules/admin/routes.ts",
    ]);

    expect(context).toMatchObject({
      plan: {
        intent: "api",
        phase: "implementation",
        modules: apiPlan.modules,
        officialContext: apiPlan.officialContext,
        paths: ["apps/api/src/modules/admin/routes.ts"],
      },
      project: projectContext(),
    });
  });
});
