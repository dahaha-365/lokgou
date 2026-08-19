---
title: 代码质量与工具
description: lokgou Monorepo 的格式化、Lint、测试、类型检查和 CI 约定。
---

# 代码质量与工具

## 格式化

根目录的 `prettier.config.ts` 是所有 workspace 的默认格式化配置。`.editorconfig` 提供 IDE 无关的缩进、换行和编码回退规则。

```bash
bun run format
bun run format:check
```

VS Code 工作区默认启用保存时格式化。JetBrains、Zed 等支持 Prettier 和 EditorConfig 的 IDE 会自动读取这些配置。

## 质量命令

```bash
bun run lint
bun run typecheck
bun run test
bun run quality
```

根质量命令聚合各 workspace 的 `lint`、`typecheck` 与 `test` 脚本。GitHub Actions 也按 workspace 独立执行这些脚本，并输出文本覆盖率、上传 LCOV 覆盖率工件，随后构建 API。

## CI Seed API 冒烟测试

GitHub Actions 会在独立 SQLite 数据库执行 `db:push` 与 `db:seed`，再通过 `app.handle()` 登录 seed 的 `admin` 账号并调用 OpenAPI 中的只读管理端接口。测试会发现 seed 数据的实际 ID，逐个输出请求路径与 HTTP 状态，并验证调用路径存在于 `/openapi/json` 文档中；不会执行会改变业务资源或上传文件的接口。

本地需要复现该检查时，使用独立数据库并显式启用测试：

```bash
DATABASE_URL="file:./prisma/ci-api-smoke.db" bun run db:push
DATABASE_URL="file:./prisma/ci-api-smoke.db" bun run db:seed
CI_API_SEED_TEST=true \
ADMIN_APP_KEY=ci-admin-app-key \
JWT_SECRET=ci-jwt-secret-with-at-least-32-characters \
DATABASE_URL="file:./prisma/ci-api-smoke.db" \
bun --filter @lokgou/api test src/app.seed-api.test.ts
```

## Workspace 工具策略

格式化默认使用根 Prettier 配置。只有框架专有文件或生成代码规范无法用根配置的 `overrides` 表达时，才允许在 workspace 内添加局部配置。

Lint 与测试工具可按运行时选择：

- Bun/Elysia API：ESLint 和 `bun:test`。
- 纯 TypeScript schema 包：ESLint 和 `bun:test`。
- 未来 Vite 前端：ESLint、Vitest、Testing Library；端到端测试使用 Playwright。
- Electron、UniApp：保留根格式化规范，使用各生态推荐的 lint/test 工具，并提供统一脚本名。

每个新 workspace 必须至少提供 `lint`、`typecheck` 和 `test` 脚本，再加入 GitHub Actions 的 workspace matrix。

## API 本地化

API 默认语言为 `zh-CN`。请求可使用 `Accept-Language: en` 或 `en-US` 获取英文验证与自定义业务错误；其他语言或缺少该请求头时回退到 `zh-CN`。标准 Zod 验证消息直接使用 `zod/locales` 的 `zhCN` 和 `en` error map 作为全局兜底。

自定义业务消息按语言和模块拆分在 `src/lib/i18n/<locale>/<module>/`，例如 `src/lib/i18n/zh-CN/admin/auth.ts`、`users.ts`、`departments.ts` 与 `autocode.ts`。通过 `t(locale, "admin.autocode.ruleRequired", value)` 访问，不能在 controller 中硬编码单一语言消息。

## AI Context

根 `AGENTS.md` 记录 AI 使用的项目事实和代码约定。`.ai/llms.txt` 是 Bun、Elysia、Prisma、Zod、Scalar 与 Faker 的官方资料索引，应按任务按需加载；`.ai/full-llms.txt` 仅用于架构、依赖升级和新 workspace 等跨模块工作。官方文档保持外部引用，避免在仓库提交容易过期的完整厂商文档副本。
