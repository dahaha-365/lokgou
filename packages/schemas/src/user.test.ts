import { describe, expect, test } from "bun:test";
import { UserCreateSchema } from "./user";

describe("UserCreateSchema", () => {
  test("applies account defaults", () => {
    expect(
      UserCreateSchema.parse({ username: "admin", password: "secure-password" })
    ).toMatchObject({
      username: "admin",
      enableState: 0,
      isAdmin: false,
    });
  });

  test("requires a password", () => {
    expect(() => UserCreateSchema.parse({ username: "admin" })).toThrow();
  });
});
