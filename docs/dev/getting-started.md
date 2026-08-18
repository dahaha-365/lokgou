---
title: 本地开发
description: 在本地安装依赖、初始化 SQLite 数据库并启动 lokgou API。
---

# 本地开发

## 前置条件

- Bun 1.3 或更高版本。
- 已配置 `apps/api/.env`，至少包含 `DATABASE_URL` 与 `ADMIN_APP_KEY`。

```env
DATABASE_URL="file:./prisma/dev.db"
ADMIN_APP_KEY="replace-with-a-secure-random-value"
JWT_SECRET="replace-with-a-secure-random-value-at-least-32-characters"
```

## 启动

```bash
bun install
bun run db:push
bun run db:seed
bun run dev
```

服务默认运行在 `http://localhost:3000`。

- Scalar：`/openapi`
- OpenAPI JSON：`/openapi/json`

## 常用命令

```bash
bun run build
bun run quality
bun run db:migrate
bun run db:studio
bun run db:seed
```

`bun run quality` 会按顺序执行格式检查、Lint、类型检查和测试。

## 演示数据

`bun run db:seed` 会先清空本地数据库中的部门负责人、会话、部门和用户，再使用固定的 Faker seed 写入可重复的演示数据。

seed 会调用 `USERNAME` 与 `DEPARTMENT_CODE` 自动编码规则，为模拟用户和部门生成实际编号示例。

本地管理员账号仅用于开发与接口调试：

```text
username: admin
password: admin123456
```

不要在生产环境运行该 seed，也不要在生产环境使用此密码。

## 本地数据库重建

当 Prisma schema 包含不兼容的主键类型变更时，例如从字符串 ID 改为自增整数 ID，SQLite 无法保留原数据完成转换。停止正在运行的 API 服务后，删除本地 `apps/api/prisma/dev.db`，再执行：

```bash
bun run db:push
bun run db:seed
```

`dev.db` 是被 Git 忽略的本地开发数据；生产数据库应通过备份和正式迁移计划处理此类变更。
