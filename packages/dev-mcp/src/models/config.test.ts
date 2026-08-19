import { describe, expect, test } from "bun:test";
import { resolveModel, type DevMcpConfig, type ModelConfig } from "./config";
import { complete } from "./client";

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

describe("complete", () => {
  async function captureRequest(parameters: ModelConfig["parameters"]) {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.TEST_MODEL_KEY;
    process.env.TEST_MODEL_KEY = "test-key";
    let requestBody: Record<string, unknown> | undefined;
    globalThis.fetch = (async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      await complete(
        {
          baseUrl: "https://model.example/v1",
          apiKeyEnv: "TEST_MODEL_KEY",
          model: "model-without-temperature",
          parameters,
        },
        "system",
        "prompt"
      );
      return requestBody;
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.TEST_MODEL_KEY;
      else process.env.TEST_MODEL_KEY = originalKey;
    }
  }

  test("does not send temperature when it is not configured", async () => {
    expect(await captureRequest({})).not.toHaveProperty("temperature");
  });

  test("sends an explicitly configured zero temperature", async () => {
    expect(await captureRequest({ temperature: 0 })).toHaveProperty("temperature", 0);
  });
});
