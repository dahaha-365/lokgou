import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const originalAppKey = process.env.ADMIN_APP_KEY;

beforeEach(() => {
  process.env.ADMIN_APP_KEY = "test-admin-app-key";
});

afterEach(() => {
  process.env.ADMIN_APP_KEY = originalAppKey;
});

describe("admin routes", () => {
  test("reject requests without admin-app-key", async () => {
    const { adminController } = await import("./admin.controller");
    const response = await adminController.handle(new Request("http://localhost/admin/users"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      message: "无效的 admin-app-key",
      code: "ADMIN_UNAUTHORIZED",
    });
  });

  test("accepts the configured admin-app-key", async () => {
    const { adminController } = await import("./admin.controller");
    const response = await adminController.handle(
      new Request("http://localhost/admin/users", {
        headers: { "admin-app-key": "test-admin-app-key" },
      })
    );

    expect(response.status).not.toBe(401);
  });
});
