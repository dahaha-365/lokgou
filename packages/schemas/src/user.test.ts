import { describe, expect, test } from "bun:test";
import { UserCreateSchema } from "./user";

describe("UserCreateSchema", () => {
  test("applies account defaults", () => {
    expect(UserCreateSchema.parse({ username: "admin" })).toMatchObject({
      username: "admin",
      enableState: 0,
      isAdmin: false,
    });
  });
});
