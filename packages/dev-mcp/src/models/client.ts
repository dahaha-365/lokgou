import type { ModelConfig } from "./config";

type ContentPart = {
  type?: string;
  text?: string;
};

type ResponsesOutputItem = {
  content?: ContentPart[];
};

type ModelPayload = {
  choices?: { message?: { content?: string | ContentPart[] } }[];
  output_text?: string;
  output?: ResponsesOutputItem[];
  content?: ContentPart[];
};

function outputContent(payload: ModelPayload): string | undefined {
  if (payload.output_text) return payload.output_text;

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" || part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
  return text || undefined;
}

export async function complete(
  model: ModelConfig,
  system: string,
  prompt: string
): Promise<string> {
  const apiKey = process.env[model.apiKeyEnv];
  if (!apiKey) throw new Error(`Missing environment variable ${model.apiKeyEnv}.`);

  const baseUrl = model.baseUrl.replace(/\/$/, "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  const body: Record<string, unknown> = { model: model.model };
  let url = `${baseUrl}/chat/completions`;

  if (model.endpoint === "messages") {
    url = `${baseUrl}/messages`;
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body.system = system;
    body.messages = [{ role: "user", content: prompt }];
    body.max_tokens = model.parameters.maxTokens ?? 4096;
  } else if (model.endpoint === "responses") {
    url = `${baseUrl}/responses`;
    headers.authorization = `Bearer ${apiKey}`;
    body.instructions = system;
    body.input = prompt;
  } else {
    headers.authorization = `Bearer ${apiKey}`;
    body.messages = [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ];
  }

  if (model.parameters.temperature !== undefined) body.temperature = model.parameters.temperature;
  if (model.parameters.maxTokens !== undefined && model.endpoint !== "messages") {
    body[model.endpoint === "responses" ? "max_output_tokens" : "max_tokens"] =
      model.parameters.maxTokens;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`Model request failed: ${response.status} ${await response.text()}`);

  const payload = (await response.json()) as ModelPayload;
  const content =
    model.endpoint === "responses"
      ? outputContent(payload)
      : model.endpoint === "messages"
        ? payload.content?.map((part) => part.text ?? "").join("")
        : typeof payload.choices?.[0]?.message?.content === "string"
          ? payload.choices[0].message.content
          : payload.choices?.[0]?.message?.content?.map((part) => part.text ?? "").join("");
  if (!content) throw new Error("Model response did not contain a completion.");
  return content;
}
