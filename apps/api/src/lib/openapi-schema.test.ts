import { describe, expect, test } from "bun:test";
import { cleanOpenApiDocument, type JsonSchema } from "./openapi-schema";

describe("OpenAPI schema cleanup", () => {
  test("removes email implementation pattern", () => {
    const result = cleanOpenApiDocument({
      properties: {
        email: {
          type: "string",
          format: "email",
          pattern: "zod-internal-regex",
        },
      },
    } as JsonSchema);

    expect(result.properties?.email).toEqual({
      type: "string",
      format: "email",
    });
  });

  test("converts enableState to OpenAPI enum", () => {
    const result = cleanOpenApiDocument({
      properties: {
        enableState: {
          default: 0,
          anyOf: [
            { type: "number", const: 0, description: "正常" },
            { type: "number", const: 1, description: "已停用" },
            { type: "number", const: 2, description: "待审核" },
          ],
          description: "状态：0-正常；1-已停用；2-待审核",
        },
      },
    } as JsonSchema);

    expect(result.properties?.enableState).toEqual({
      type: "integer",
      enum: [0, 1, 2],
      default: 0,
      description: "状态：0-正常；1-已停用；2-待审核",
    });
  });
});
