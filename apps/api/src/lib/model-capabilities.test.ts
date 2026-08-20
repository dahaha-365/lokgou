import { describe, expect, it } from "bun:test";
import { isSoftDeleteModel, modelCapabilities } from "./model-capabilities";

describe("model capabilities", () => {
  it("declares soft-delete models explicitly", () => {
    expect(modelCapabilities.Position.softDeletes).toBe(true);
    expect(isSoftDeleteModel("Position")).toBe(true);
    expect(isSoftDeleteModel("UserSession")).toBe(false);
  });
});
