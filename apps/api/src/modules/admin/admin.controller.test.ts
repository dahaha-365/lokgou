import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const originalAppKey = process.env.ADMIN_APP_KEY;
const originalJwtSecret = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.ADMIN_APP_KEY = "test-admin-app-key";
  process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
});

afterEach(() => {
  process.env.ADMIN_APP_KEY = originalAppKey;
  process.env.JWT_SECRET = originalJwtSecret;
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

  test("requires an access token after app-key validation", async () => {
    const { adminController } = await import("./admin.controller");
    const response = await adminController.handle(
      new Request("http://localhost/admin/users", {
        headers: { "admin-app-key": "test-admin-app-key" },
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      message: "访问令牌无效",
      code: "AUTH_UNAUTHORIZED",
    });
  });

  test("exempts login from the access token guard", async () => {
    const { adminController } = await import("./admin.controller");
    const response = await adminController.handle(
      new Request("http://localhost/admin/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "admin-app-key": "test-admin-app-key",
        },
        body: JSON.stringify({ username: "admin", password: "admin123456" }),
      })
    );

    expect(response.status).not.toBe(401);
  });
});
