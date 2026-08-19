import { z } from "zod";

const modelSchema = z.object({
  baseUrl: z.url(),
  apiKeyEnv: z.string().min(1),
  model: z.string().min(1),
  parameters: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().positive().optional(),
    })
    .default({}),
});

const configSchema = z.object({
  largeModel: modelSchema,
  smallModel: modelSchema,
  roles: z.record(z.string(), modelSchema.partial()).default({}),
});

export type ModelConfig = z.infer<typeof modelSchema>;
export type DevMcpConfig = z.infer<typeof configSchema>;

export type ModelRole = "orchestrator" | "code-gen" | "validator" | "summarizer" | "translator";

const fallbackTier: Record<ModelRole, "largeModel" | "smallModel"> = {
  orchestrator: "largeModel",
  "code-gen": "smallModel",
  validator: "smallModel",
  summarizer: "smallModel",
  translator: "smallModel",
};

export function resolveModel(config: DevMcpConfig, role: ModelRole): ModelConfig {
  const fallback = config[fallbackTier[role]];
  const override = config.roles[role];
  return modelSchema.parse({
    ...fallback,
    ...override,
    parameters: { ...fallback.parameters, ...override?.parameters },
  });
}

export async function loadConfig(): Promise<DevMcpConfig> {
  const path = new URL("../../../../.ai/dev-mcp.config.json", import.meta.url);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(
      "Missing .ai/dev-mcp.config.json. Copy .ai/dev-mcp.config.example.json and configure models locally."
    );
  }
  return configSchema.parse(await file.json());
}
