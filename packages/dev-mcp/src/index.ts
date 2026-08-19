import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig, resolveModel, type ModelRole } from "./models/config";
import { complete } from "./models/client";
import { buildModelContext, defaultContextLevel, type ContextLevel } from "./context";
import { projectContext } from "./project";
import { routeTask, type CompletedTaskPhase } from "./router";
import { promptForPhase } from "./rules/template-engine";

const server = new McpServer({ name: "lokgou-dev-mcp", version: "1.0.0" });
const taskPhaseSchema = z.enum(["planning", "implementation", "validation", "reassessment"]);
const completedTaskPhaseSchema = z.enum(["planning", "implementation", "validation"]);
const contextLevelSchema = z.enum(["minimal", "standard", "full"]);

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

server.registerTool(
  "analyze_project",
  {
    description:
      "Returns lokgou modules, technology stacks, and development rules for task planning.",
  },
  async () => result(projectContext())
);

server.registerTool(
  "route_task",
  {
    description:
      "Classifies a development task and returns the recommended model tier, relevant modules, and official context.",
    inputSchema: {
      task: z.string().min(1),
      paths: z.array(z.string()).optional(),
      phase: taskPhaseSchema.optional(),
    },
  },
  async ({ task, paths, phase }) => result(routeTask(task, paths, phase))
);

server.registerTool(
  "delegate_task",
  {
    description:
      "Calls the model configured for an orchestration role. Each role can override the default large or small model.",
    inputSchema: {
      task: z.string().min(1),
      paths: z.array(z.string()).optional(),
      phase: taskPhaseSchema.optional(),
      completedPhase: completedTaskPhaseSchema.optional(),
      outcome: z.string().min(1).optional(),
      role: z
        .enum(["orchestrator", "code-gen", "validator", "summarizer", "translator"])
        .optional(),
      contextLevel: contextLevelSchema.optional(),
    },
  },
  async ({ task, paths, phase, completedPhase, outcome, role, contextLevel }) => {
    if (phase === "reassessment" && (!completedPhase || !outcome)) {
      throw new Error("Reassessment requires completedPhase and outcome.");
    }
    const plan = routeTask(task, paths, phase);
    const config = await loadConfig();
    const selectedRole: ModelRole = role ?? plan.recommendedRole;
    const selectedContextLevel: ContextLevel = contextLevel ?? defaultContextLevel(plan.phase);
    const context = JSON.stringify(buildModelContext(plan, selectedContextLevel, paths), null, 2);
    const reassessment =
      plan.phase === "reassessment"
        ? { completedPhase: completedPhase as CompletedTaskPhase, outcome: outcome as string }
        : undefined;
    const prompt = promptForPhase(plan.phase, plan.intent, task, context, reassessment);
    const completion = await complete(
      resolveModel(config, selectedRole),
      "Follow AGENTS.md and .ai/agent-orchestration.md.",
      prompt
    );
    return result({ role: selectedRole, plan, contextLevel: selectedContextLevel, completion });
  }
);

await server.connect(new StdioServerTransport());
