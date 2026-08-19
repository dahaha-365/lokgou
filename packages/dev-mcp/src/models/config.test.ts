import { describe, expect, test } from "bun:test";
import { resolveModel, type DevMcpConfig } from "./config";

const config: DevMcpConfig = {
  largeModel: {
    baseUrl: "https://large.example/v1",
    apiKeyEnv: "LARGE_KEY",
    model: "large-model",
    parameters: { temperature: 0.2, maxTokens: 8000 },
  },
  smallModel: {
    baseUrl: "https://small.example/v1",
    apiKeyEnv: "SMALL_KEY",
    model: "small-model",
    parameters: { temperature: 0.1, maxTokens: 4000 },
  },
  roles: {
    validator: { model: "validator-model", parameters: { temperature: 0 } },
  },
};

describe("resolveModel", () => {
  test("uses the role fallback model when no override exists", () => {
    expect(resolveModel(config, "translator")).toMatchObject({
      model: "small-model",
      apiKeyEnv: "SMALL_KEY",
    });
  });

  test("merges role overrides with its fallback model", () => {
    expect(resolveModel(config, "validator")).toMatchObject({
      baseUrl: "https://small.example/v1",
      model: "validator-model",
      parameters: { temperature: 0, maxTokens: 4000 },
    });
  });
});
