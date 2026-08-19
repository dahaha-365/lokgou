import { describe, expect, test } from "bun:test";
import {
  configSchema,
  endpointSchema,
  resolveModel,
  type DevMcpConfig,
  type ModelConfig,
} from "./config";
import { complete } from "./client";

const config: DevMcpConfig = {
  largeModel: {
    baseUrl: "https://large.example/v1",
    apiKeyEnv: "LARGE_KEY",
    model: "large-model",
    endpoint: "chat/completions",
    parameters: { temperature: 0.2, maxTokens: 8000 },
  },
  smallModel: {
    baseUrl: "https://small.example/v1",
    apiKeyEnv: "SMALL_KEY",
    model: "small-model",
    endpoint: "chat/completions",
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

describe("endpoint configuration", () => {
  test("defaults to chat completions", () => {
    expect(endpointSchema.parse(undefined)).toBe("chat/completions");
    expect(
      configSchema.parse({ ...config, largeModel: { ...config.largeModel, endpoint: undefined } })
        .largeModel.endpoint
    ).toBe("chat/completions");
  });
});

describe("complete", () => {
  async function captureRequest(endpoint: ModelConfig["endpoint"], responseBody: unknown) {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.TEST_MODEL_KEY;
    process.env.TEST_MODEL_KEY = "test-key";
    let requestBody: Record<string, unknown> | undefined;
    let requestUrl: string | undefined;
    let requestHeaders: Headers | undefined;
    globalThis.fetch = (async (input, init) => {
      requestUrl = String(input);
      requestHeaders = new Headers(init?.headers);
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const completion = await complete(
        {
          baseUrl: "https://model.example/v1",
          apiKeyEnv: "TEST_MODEL_KEY",
          model: "test-model",
          endpoint,
          parameters: { maxTokens: 100 },
        },
        "system",
        "prompt"
      );
      return { url: requestUrl, headers: requestHeaders, body: requestBody, completion };
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.TEST_MODEL_KEY;
      else process.env.TEST_MODEL_KEY = originalKey;
    }
  }

  test("does not send temperature when it is not configured", async () => {
    const request = await captureRequest("chat/completions", {
      choices: [{ message: { content: "ok" } }],
    });
    expect(request).toMatchObject({
      url: "https://model.example/v1/chat/completions",
      body: {
        model: "test-model",
        messages: [{ role: "system" }, { role: "user" }],
        max_tokens: 100,
      },
    });
    expect(request.headers?.get("authorization")).toBe("Bearer test-key");
  });

  test("sends an explicitly configured zero temperature", async () => {
    const request = await captureRequest("responses", { output_text: "ok" });
    expect(request).toMatchObject({
      url: "https://model.example/v1/responses",
      body: {
        model: "test-model",
        instructions: "system",
        input: "prompt",
        max_output_tokens: 100,
      },
    });
    expect(request.headers?.get("authorization")).toBe("Bearer test-key");
  });

  test("uses Anthropic Messages authentication and response content", async () => {
    const request = await captureRequest("messages", {
      content: [
        { type: "text", text: "hello " },
        { type: "text", text: "world" },
      ],
    });
    expect(request).toMatchObject({
      url: "https://model.example/v1/messages",
      body: {
        model: "test-model",
        system: "system",
        messages: [{ role: "user", content: "prompt" }],
      },
    });
    expect(request.headers?.get("x-api-key")).toBe("test-key");
    expect(request.headers?.get("anthropic-version")).toBe("2023-06-01");
    expect(request.completion).toBe("hello world");
  });

  test("parses Responses output content and ignores reasoning items", async () => {
    const request = await captureRequest("responses", {
      output: [
        { content: [{ type: "reasoning", text: "internal" }] },
        {
          content: [
            { type: "output_text", text: "hello " },
            { type: "text", text: "world" },
          ],
        },
      ],
    });
    expect(request.url).toBe("https://model.example/v1/responses");
    expect(request.completion).toBe("hello world");
  });
});
