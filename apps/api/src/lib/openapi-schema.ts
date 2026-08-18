export type JsonSchema = {
  properties?: Record<string, JsonSchema>;
  [key: string]: unknown;
};

function cleanSchema(schema: JsonSchema, propertyName?: string): JsonSchema {
  if (!schema || typeof schema !== "object") return schema;

  if (Array.isArray(schema)) {
    return schema.map((item) => cleanSchema(item as JsonSchema)) as unknown as JsonSchema;
  }

  const out: JsonSchema = { ...schema };

  // Remove Zod implementation regexes while preserving standard OpenAPI formats.
  if (propertyName === "email" && out.format === "email") {
    delete out.pattern;
  }

  // Convert enableState's Zod union of numeric literals into OpenAPI enum.
  if (
    Array.isArray(out.anyOf) &&
    out.anyOf.length === 3 &&
    out.anyOf.every((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      return item.type === "number" && [0, 1, 2].includes(item.const as number);
    })
  ) {
    return {
      type: "integer",
      enum: [0, 1, 2],
      ...(out.default !== undefined ? { default: out.default } : {}),
      ...(out.description ? { description: out.description } : {}),
    };
  }

  if (out.properties) {
    out.properties = Object.fromEntries(
      Object.entries(out.properties).map(([name, value]) => [
        name,
        cleanSchema(value as JsonSchema, name),
      ])
    );
  }

  for (const key of ["items", "additionalProperties", "not", "if", "then", "else"]) {
    if (out[key] && typeof out[key] === "object") {
      out[key] = cleanSchema(out[key] as JsonSchema);
    }
  }

  for (const key of ["allOf", "anyOf", "oneOf"]) {
    if (Array.isArray(out[key])) {
      out[key] = out[key].map((item) => cleanSchema(item as JsonSchema));
    }
  }

  return out;
}

export function cleanOpenApiDocument(document: JsonSchema): JsonSchema {
  return cleanSchema(document);
}
