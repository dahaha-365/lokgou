import { Elysia } from "elysia";
import { openapi, type ElysiaOpenAPIConfig } from "@elysia/openapi";
import { z } from "zod";
import { exposeErrorDetails, getAdminAuthorizationHeader } from "@api/lib/config";
import { localizeValidationIssues, requestLocale, t } from "@api/lib/i18n";
import { adminController } from "@api/admin/admin.controller";

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
    { name: "Positions", description: "职位管理" },
    { name: "Department / Leaders", description: "部门负责人管理" },
    { name: "Auth", description: "管理端认证与会话管理" },
    { name: "System / AutoCode", description: "系统自动编码规则管理" },
    { name: "Roles", description: "角色与权限管理" },
    { name: "Permissions", description: "细粒度权限与数据范围管理" },
    { name: "Menus", description: "分组菜单、菜单项与按钮管理" },
    { name: "Dicts", description: "系统数据字典与字典项管理" },
    { name: "Attachments", description: "系统附件上传、分类与标签管理" },
    { name: "System / Audit Logs", description: "管理端资源操作审计日志" },
  ],
  "x-tagGroups": [
    {
      name: "Admin",
      tags: [
        "Auth",
        "Users",
        "Departments",
        "Positions",
        "Department / Leaders",
        "Roles",
        "Permissions",
        "Menus",
        "Dicts",
        "Attachments",
        "System / Audit Logs",
        "System / AutoCode",
      ],
    },
  ],
  components: {
    securitySchemes: {
      AdminAppKey: {
        type: "apiKey",
        in: "header",
        name: "admin-app-key",
        description: "管理端应用访问密钥。所有 /admin 接口均需要此请求头。",
      },
      AdminAccessToken: {
        type: "apiKey",
        in: "header",
        name: getAdminAuthorizationHeader(),
        description: "管理用户登录后取得的 access token。",
      },
    },
  },
  security: [{ AdminAppKey: [], AdminAccessToken: [] }],
};

export const app = new Elysia({ name: "lokgou-api" })
  .onError(({ code, request, set }) => {
    if (code === "NOT_FOUND") {
      const locale = requestLocale(request.headers.get("accept-language") ?? undefined);
      set.status = 404;
      return {
        code: "NOT_FOUND",
        message: t(locale, "common.notFound"),
        data: null,
      };
    }
  })
  .use(
    openapi({
      path: "/openapi",
      specPath: "/openapi/json",
      scalar: {
        localization: { locale: "zh-CN" },
        persistAuth: true,
        authentication: { preferredSecurityScheme: "AdminAppKey" },
      },
      documentation,
      mapJsonSchema: { zod: z.toJSONSchema },
    })
  )
  .onError(({ code, error, request, set }) => {
    console.error(error);
    if (code === "VALIDATION") {
      const locale = requestLocale(request.headers.get("accept-language") ?? undefined);
      set.status = 422;
      return {
        code: "VALIDATION_ERROR",
        message: t(locale, "common.validationFailed"),
        data: { issues: localizeValidationIssues(error.all, locale) },
      };
    }
    set.status = 500;
    const locale = requestLocale(request.headers.get("accept-language") ?? undefined);
    return {
      code: "INTERNAL_SERVER_ERROR",
      message: t(locale, "common.internalServerError"),
      data: exposeErrorDetails()
        ? { details: error instanceof Error ? error.message : error }
        : null,
    };
  })
  // .get("/", () => ({
  //   name: "lokgou",
  //   version: "1.0.0",
  //   docs: "/openapi",
  //   openapi: "/openapi/json",
  // }))
  .use(adminController);

if (import.meta.main) {
  app.listen(3000);
  console.info(`🦊 Lokgou API: ${app.server?.url}`);
  console.info(`📚 Scalar: ${app.server?.url}openapi`);
  console.info(`📄 OpenAPI: ${app.server?.url}openapi/json`);
}
