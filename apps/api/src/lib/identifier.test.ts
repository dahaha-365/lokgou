import { describe, expect, test } from "bun:test";
import { createIdentifier, resolveIdentifierMiddle } from "./identifier";

describe("createIdentifier", () => {
  test("joins a required prefix, optional middle segment, and padded counter", () => {
    expect(createIdentifier({ prefix: "DEP-", middle: "OPS-", counter: 42, length: 6 })).toBe(
      "DEP-OPS-000042"
    );
  });

  test("omits an empty middle segment", () => {
    expect(createIdentifier({ prefix: "USR", counter: 7, length: 4 })).toBe("USR0007");
  });

  test("resolves date placeholders in the middle segment", () => {
    expect(resolveIdentifierMiddle("-{YYYY}{MM}-", new Date("2026-08-18T00:00:00Z"))).toBe(
      "-202608-"
    );
  });
});
