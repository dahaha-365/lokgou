---
title: API 模块
description: Elysia API 的顶级模块、子模块、路由注册和 admin 模块约定。
---

# API 模块

API 模块位于 `apps/api/src/modules`。

```text
modules/
  admin/
    admin.controller.ts
    routes.ts
    users/
      user.controller.ts
      user.service.ts
```

## 顶级模块

顶级模块负责路由前缀、模块级 guard 和子模块聚合。模块 controller 会在 `apps/api/src/app.ts` 中挂载。

顶级模块的 `routes.ts` 导出一个 Elysia 路由插件，子模块 controller 在该文件中统一注册。这样模块边界明确，且 Bun 构建、TypeScript 检查和 CI 无需依赖不可靠的运行时文件扫描。

## Admin 模块

`admin` 是当前的顶级模块，默认路由前缀为 `/admin`，可通过 `ADMIN_PREFIX` 修改。其 guard 要求每个请求包含匹配的 `admin-app-key` 请求头。

`admin/auth` 使用 `@elysia/jwt` 提供登录、access token、refresh token 轮换和持久化会话管理。它需要配置 `JWT_SECRET`；会话撤销后关联的 access token 不再有效。除 `/admin/auth/login` 外，所有 admin 路由均要求 access token。token 从 `ADMIN_AUTHORIZATION_HEADER` 指定的请求头读取，默认是 `admin-authorization`。

新增 admin 资源应放入 `modules/admin/<resource>/`，并通过脚手架或 `admin/routes.ts` 注册。

## OpenAPI

子模块 controller 应声明自己的资源 tag，例如 `Users`、`Departments`。`app.ts` 使用 Scalar 的 `x-tagGroups` 将这些 tag 放在 `Admin` 文档分组下。

## 业务编号

`src/lib/identifier.ts` 提供通用编号生成器：必填前缀、可选中段和指定长度的计数器组成编号。例如：

```ts
createIdentifier({ prefix: "DEP-", middle: "OPS-", counter: 42, length: 6 });
// DEP-OPS-000042
```

计数器由 `admin/system/autocode` 规则模块持久化管理。规则按业务键和渲染后的中段独立计数，可在事务中安全递增。用户未传 `username` 时读取 `USERNAME` 规则；部门未传 `code` 时读取 `DEPARTMENT_CODE` 规则。未配置规则时不会生成编码，并返回 `AUTOCODE_RULE_REQUIRED`。
