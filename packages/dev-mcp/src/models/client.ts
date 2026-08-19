import type { ModelConfig } from "./config";

export async function complete(
  model: ModelConfig,
  system: string,
  prompt: string
): Promise<string> {
  const apiKey = process.env[model.apiKeyEnv];
  if (!apiKey) throw new Error(`Missing environment variable ${model.apiKeyEnv}.`);

  const response = await fetch(`${model.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: model.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      ...(model.parameters.temperature === undefined
        ? {}
        : { temperature: model.parameters.temperature }),
      ...(model.parameters.maxTokens ? { max_tokens: model.parameters.maxTokens } : {}),
    }),
  });
  if (!response.ok)
    throw new Error(`Model request failed: ${response.status} ${await response.text()}`);

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Model response did not contain a completion.");
  return content;
}
