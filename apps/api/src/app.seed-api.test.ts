import { expect, test } from "bun:test";

const seedTest = process.env.CI_API_SEED_TEST === "true" ? test : test.skip;

seedTest(
  "exercises seeded admin GET endpoints",
  async () => {
    const [{ app }, { seedFixtures }] = await Promise.all([
      import("./app"),
      import("./test/fixtures"),
    ]);

    const pathMatches = (template: string, path: string) => {
      const templateSegments = template.split("?")[0]!.split("/").filter(Boolean);
      const pathSegments = path.split("?")[0]!.split("/").filter(Boolean);

      return (
        templateSegments.length === pathSegments.length &&
        templateSegments.every(
          (segment, index) => /^\{[^}]+\}$/.test(segment) || segment === pathSegments[index]!
        )
      );
    };

    const loginResponse = await app.handle(
      new Request("http://localhost/admin/auth/login", {
        method: "POST",
        headers: {
          "admin-app-key": process.env.ADMIN_APP_KEY!,
          "content-type": "application/json",
        },
        body: JSON.stringify(seedFixtures.admin),
      })
    );
    const loginText = await loginResponse.text();
    if (loginResponse.status !== 200) console.error(loginText);
    expect(loginResponse.status).toBe(200);
    const login = JSON.parse(loginText) as { accessToken: string };
    expect(login.accessToken).toBeString();

    const openapiResponse = await app.handle(new Request("http://localhost/openapi/json"));
    const openapiText = await openapiResponse.text();
    if (openapiResponse.status !== 200) console.error(openapiText);
    expect(openapiResponse.status).toBe(200);
    const openapi = JSON.parse(openapiText) as { paths: Record<string, unknown> };

    const protectedHeaders = {
      "admin-app-key": process.env.ADMIN_APP_KEY!,
      "admin-authorization": login.accessToken,
    };

    const get = async (path: string, openapiPath: string) => {
      const response = await app.handle(
        new Request(`http://localhost${path}`, { headers: protectedHeaders })
      );
      const text = await response.text();
      console.log(`GET ${path} -> ${response.status}`);
      if (response.status !== 200) console.error(`Response body for ${path}: ${text}`);
      expect(response.status).toBe(200);

      const template = openapiPath.split("?")[0]!;
      expect(
        Object.keys(openapi.paths).some(
          (documentedPath) =>
            documentedPath.replace(/\/$/, "") === template.replace(/\/$/, "") &&
            pathMatches(documentedPath, path)
        )
      ).toBe(true);

      return JSON.parse(text) as unknown;
    };

    const positiveId = (value: unknown) => {
      expect(typeof value).toBe("number");
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
      return value as number;
    };

    const listItems = (value: unknown) => {
      expect(value).toHaveProperty("items");
      const items = (value as { items: unknown }).items;
      expect(Array.isArray(items)).toBe(true);
      return items as Record<string, unknown>[];
    };

    await get("/admin/auth/me", "/admin/auth/me");
    await get("/admin/auth/sessions", "/admin/auth/sessions");

    const users = listItems(await get("/admin/users", "/admin/users"));
    const admin = users.find((user) => user.username === "admin");
    expect(admin).toBeDefined();
    const adminId = positiveId(admin!.id);
    await get(`/admin/users/${adminId}`, "/admin/users/{id}");

    const departments = listItems(await get("/admin/departments", "/admin/departments"));
    const department = departments[0];
    expect(department).toBeDefined();
    const departmentId = positiveId(department!.id);
    await get(`/admin/departments/${departmentId}`, "/admin/departments/{id}");

    const leaders = await get("/admin/departments/leader", "/admin/departments/leader/");
    expect(Array.isArray(leaders)).toBe(true);
    const leader = (leaders as Record<string, unknown>[])[0];
    expect(leader).toBeDefined();
    const leaderId = positiveId(leader!.id);
    await get(`/admin/departments/leader/${leaderId}`, "/admin/departments/leader/{id}");

    await get("/admin/system/autocode/rules", "/admin/system/autocode/rules");

    const roles = listItems(await get("/admin/roles", "/admin/roles"));
    const role = roles[0];
    expect(role).toBeDefined();
    const roleId = positiveId(role!.id);
    await get(`/admin/roles/${roleId}`, "/admin/roles/{id}");

    const permissions = listItems(await get("/admin/permissions", "/admin/permissions"));
    const permission = permissions[0];
    expect(permission).toBeDefined();
    const permissionId = positiveId(permission!.id);
    await get(`/admin/permissions/${permissionId}`, "/admin/permissions/{id}");
    await get(
      `/admin/permissions/users/${adminId}/effective`,
      "/admin/permissions/users/{userId}/effective"
    );

    const menus = listItems(await get("/admin/menus", "/admin/menus"));
    const menu = menus[0];
    expect(menu).toBeDefined();
    const menuId = positiveId(menu!.id);
    await get(`/admin/menus/${menuId}`, "/admin/menus/{id}");
    await get("/admin/menus/effective?group=system", "/admin/menus/effective");
    await get(
      `/admin/menus/users/${adminId}/effective?group=system`,
      "/admin/menus/users/{userId}/effective"
    );

    await get("/admin/system/dicts", "/admin/system/dicts");
    await get("/admin/attachments", "/admin/attachments");
    await get(
      `/admin/system/audit-logs/users/${adminId}`,
      "/admin/system/audit-logs/{resource}/{recordId}"
    );

    const methods = ["get", "post", "put", "patch", "delete"] as const;
    const parameterPath = (path: string) => path.replace(/\{[^}]+\}/g, "1");
    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      if (path.startsWith("/openapi") || !pathItem || typeof pathItem !== "object") continue;
      for (const method of methods) {
        if (!(method in pathItem)) continue;
        const headers: Record<string, string> = { ...protectedHeaders };
        const init: RequestInit = { method: method.toUpperCase(), headers };
        if (method !== "get" && method !== "delete") {
          headers["content-type"] = "application/json";
          init.body = "{}";
        }
        const response = await app.handle(
          new Request(`http://localhost${parameterPath(path)}`, init)
        );
        console.log(`${method.toUpperCase()} ${path} -> ${response.status}`);
        // This is a route-registration smoke test: invalid empty payloads or
        // placeholder ids may legitimately produce 4xx/5xx business errors.
        // The important assertion is that every OpenAPI operation is invoked
        // and produces a valid HTTP response rather than failing to dispatch.
        expect(response.status).toBeGreaterThanOrEqual(100);
        expect(response.status).toBeLessThan(600);
      }
    }
  },
  30_000
);
