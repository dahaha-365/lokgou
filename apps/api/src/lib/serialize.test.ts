import { describe, expect, test } from "bun:test";
import { serializeDates } from "./serialize";

describe("serializeDates", () => {
  test("serializes Prisma DateTime to RFC 3339 / ISO string", () => {
    const result = serializeDates({
      id: "1",
      createdAt: new Date("2026-08-17T06:30:25.000Z"),
    });

    expect(result).toEqual({
      id: "1",
      createdAt: "2026-08-17T06:30:25.000Z",
    });
  });
});
