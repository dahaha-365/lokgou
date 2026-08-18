import { Elysia } from "elysia";
import { openapi, type ElysiaOpenAPIConfig } from "@elysia/openapi";
import { z } from "zod";
import { adminController } from "./modules/admin/admin.controller";

const documentation: NonNullable<ElysiaOpenAPIConfig["documentation"]> & {
  "x-tagGroups": { name: string; tags: string[] }[];
} = {
  info: {
    title: "lokgou API 接口文档",
    version: "1.0.0",
    description: "lokgou 后端 API 接口文档（Bun + Elysia + Prisma 7 + Zod 4）",
  },
  tags: [
    { name: "Users", description: "用户管理" },
    { name: "Departments", description: "部门管理" },
    { name: "Department Leaders", description: "部门负责人管理" },
  ],
  "x-tagGroups": [
    {
      name: "Admin",
      tags: ["Users", "Departments", "Department Leaders"],
    },
  ],
};

export const app = new Elysia({ name: "lokgou-api" })
  .onError(({ code, set }) => {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        message: "请求的资源不存在",
        code: "NOT_FOUND",
      };
    }
  })
  .use(
    openapi({
      path: "/openapi",
      specPath: "/openapi/json",
      scalar: { localization: { locale: "zh-CN" } },
      documentation,
      mapJsonSchema: { zod: z.toJSONSchema },
    })
  )
  .onError(({ code, error, set }) => {
    console.error(error);
    if (code === "VALIDATION") {
      set.status = 422;
      return { message: "请求参数验证失败", code: "VALIDATION_ERROR", issues: error.all };
    }
    set.status = 500;
    return { message: "Internal Server Error", code: "INTERNAL_SERVER_ERROR" };
  })
  .get("/", () => ({
    name: "lokgou",
    version: "1.0.0",
    docs: "/openapi",
    openapi: "/openapi/json",
  }))
  .use(adminController);

if (import.meta.main) {
  app.listen(3000);
  console.log(`🦊 lokgou API: ${app.server?.url}`);
  console.log(`📚 Scalar: ${app.server?.url}openapi`);
  console.log(`📄 OpenAPI: ${app.server?.url}openapi/json`);
}
