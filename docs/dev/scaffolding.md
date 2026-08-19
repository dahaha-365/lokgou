---
title: 模块脚手架
description: 使用 Bun CLI 创建 API 顶级模块和子模块，并自动注册路由。
---

# 模块脚手架

脚手架位于 `scripts/scaffold.ts`，用于生成 `apps/api/src/modules` 下的 API 模块。

## 创建顶级模块

```bash
bun run scaffold:module reports
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
bun run scaffold:submodule admin system/audit-logs
```

生成：

```text
apps/api/src/modules/admin/system/audit-logs/
  audit-logs.controller.ts
  audit-logs.service.ts
```

同时自动更新 `apps/api/src/modules/admin/routes.ts`，将 controller 注册到父模块。

## 约束与后续工作

- 模块名必须为 kebab-case，例如 `audit-logs`。
- 文件或目录已存在时，脚手架会终止，不会覆盖已有代码。
- 父模块必须包含 `routes.ts`。
- 生成的 controller 只提供最小占位路由；请补充 Zod schema、服务逻辑、OpenAPI tag、错误响应和测试。
- 生成后执行 `bun run quality`。

## 原始命令

脚本也可直接调用：

```bash
bun run scaffold module reports
bun run scaffold submodule admin system/audit-logs
```
