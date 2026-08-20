---
title: 模块脚手架
description: 使用 Bun CLI 创建 API 顶级模块和子模块，并自动注册路由。
---

# 模块脚手架

脚手架位于 `scripts/scaffold.ts`，模板位于 `scripts/scaffold-templates/`，用于生成
`apps/api/src/modules` 下的 API 模块。脚手架生成的 service 默认使用
`createCrudServiceFromModel` 和 `createCrudModule`。

## 创建顶级模块

```bash
bun run scaffold:module reports --model Report
```

生成：

```text
apps/api/src/modules/reports/
  reports.controller.ts
  routes.ts
```

命令还会自动在 `apps/api/src/app.ts` 中导入并挂载 `reportsController`。

## 创建子模块

```bash
bun run scaffold:submodule admin system/audit-logs --model AuditLog
```

生成：

```text
apps/api/src/modules/admin/system/audit-logs/
  audit-logs.controller.ts
  audit-logs.service.ts
```

同时自动更新 `apps/api/src/modules/admin/routes.ts`，将 controller 注册到父模块。

## 路径与模型

脚手架根据命令路径自动决定生成层级：

```bash
bun run scaffold module reports --model Report
bun run scaffold submodule admin system/audit-logs --model AuditLog
```

`module` 创建顶级模块并挂载到 `app.ts`；`submodule` 根据第一个参数定位父模块，
后续路径支持多级目录，并更新最近父目录的 `routes.ts`。`--model` 必须填写 Prisma
模型名对应的 camelCase model 属性，例如 `AuditLog` 对应 `prisma.auditLog`。

生成的 service 会绑定一个 Prisma model，并获得标准 `create`、`show`、`update`、
`delete` 和 `list` 接口。资源特有的方法应作为 `createCrudModule` 的扩展追加，路由
仍需显式定义 Zod schema、响应、权限和 OpenAPI metadata。

模板是独立文件，修改生成约定时应优先修改 `scripts/scaffold-templates/`，不要把
大段源码重新嵌入 `scripts/scaffold.ts`。

## 约束与后续工作

- 模块名必须为 kebab-case，例如 `audit-logs`。
- 文件或目录已存在时，脚手架会终止，不会覆盖已有代码。
- 父模块必须包含 `routes.ts`。
- 未提供 `--model` 时，生成 service 使用占位的 `model` 名称，必须在生成后绑定真实 Prisma model。
- 生成的 controller 只提供最小占位路由；请补充 Zod schema、服务逻辑、OpenAPI tag、错误响应和测试。
- 生成后执行 `bun run quality`。

## 原始命令

脚本也可直接调用：

```bash
bun run scaffold module reports
bun run scaffold submodule admin system/audit-logs
bun run scaffold module reports --model Report
```
