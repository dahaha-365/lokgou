import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { createCrudModule, createCrudService } from "./crud-service";

describe("crud module", () => {
  const base = createCrudService({
    create: (data: { name: string }) => ({ id: 1, ...data }),
    show: (id: unknown) => ({ id: id as number, name: "default" }),
    update: (id: number, data: { name: string }) => ({ id, ...data }),
    delete: (id: number) => ({ id, name: "deleted" }),
    list: (query: { page: number }) => ({ items: [], ...query }),
  });

  it("provides defaults, overrides, and custom operations", () => {
    const module = createCrudModule(base, {
      show: (id) => ({ id: id as number, name: "overridden" }),
      restore: (id: number) => ({ id, name: "restored" }),
    });

    expect(module.show(1)).toEqual({ id: 1, name: "overridden" });
    expect(module.create({ name: "new" })).toEqual({ id: 1, name: "new" });
    expect(module.restore?.(1)).toEqual({ id: 1, name: "restored" });
  });

  it("keeps the original service factory compatible", () => {
    expect(base.delete?.(3)).toEqual({ id: 3, name: "deleted" });
  });

  it("registers only explicitly contracted methods", async () => {
    const module = createCrudModule(base, { internal: () => "private" }, [
      {
        serviceMethod: "list",
        register: (service) => new Elysia().get("/", () => service.list({ page: 1 })),
      },
    ]);
    const app = new Elysia().use(module.routes);

    expect((await app.handle(new Request("http://localhost/"))).status).toBe(200);
    expect((await app.handle(new Request("http://localhost/internal"))).status).toBe(404);
    expect(module.internal()).toBe("private");
  });
});
