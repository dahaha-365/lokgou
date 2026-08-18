# lokgou v10

Bun + Elysia + Prisma 7 + SQLite + Zod 4 + Scalar。

## v6 修正

### TypeScript 全局类型

根 `tsconfig.json` 明确配置：

```json
"types": ["bun-types", "node"]
```

API 和 schemas 同时声明 `@types/node`，因此 `process.env`、`Buffer` 等 Node 全局类型不会再出现 TS2580/相关类型错误。

### Elysia 多状态响应

所有 200/404 controller 响应统一使用 Zod：

```ts
response: {
  200: UserResponseSchema,
  404: UserNotFoundResponseSchema
}
```

错误返回统一：

```ts
return status(404, {
  message: "用户不存在",
  code: "USER_NOT_FOUND",
});
```

不再使用 `set.status = 404` 后直接返回另一种对象，也不再在 Zod 项目中混入手写 TypeBox schema。

## 启动

```bash
bun install
bun db:push
bun dev
```

`dev/start/build/typecheck` 都会自动先运行 Prisma generate。

## 地址

API: http://localhost:3000

Scalar: http://localhost:3000/openapi

OpenAPI JSON: http://localhost:3000/openapi/json

## v7 修正

- API 显式添加 `dotenv` 依赖。
- `enableState` 统一枚举：`0-正常`、`1-已停用`、`2-待审核`。
- OpenAPI 的 `enableState` 输出枚举值。
- `email` 使用 Zod 4 `z.email()`，OpenAPI 使用 `format: email`，不显示邮箱正则。
- OpenAPI / Scalar 文档标题和描述使用中文，Scalar UI 设置为 `zh-CN`。

## v8 修正

- 根目录 `bun dev`：先在 `@lokgou/api` workspace 执行 Prisma generate，再从 monorepo 根目录启动 Bun watch。
- API workspace 不再启动自己的 `--watch`，避免 `packages/schemas` 超出 watch 根目录。
- Elysia `NOT_FOUND` 返回统一 404 JSON，不再把普通 404 当作开发错误堆栈输出。
- 增加 OpenAPI schema 清理工具：移除 Zod email 的内部 `pattern`，并把 `enableState` 的 `anyOf + const` 转换为标准 OpenAPI `integer + enum`。

## v9 修正

### Zod `Date` OpenAPI warning

Zod 4 cannot represent `z.date()` / `z.coerce.date()` directly in JSON Schema. Elysia OpenAPI calls the Zod JSON Schema converter while generating `/openapi/json`, which caused:

```text
warn: Date cannot be represented in JSON Schema
```

API response DTOs now expose timestamps as JSON-native ISO 8601 strings via `z.iso.datetime()`. Prisma `Date` values are serialized with `toISOString()` before being returned.

### Scalar 中文界面

使用 Elysia OpenAPI / Scalar 正确配置：

```ts
scalar: {
  localization: {
    locale: "zh-CN";
  }
}
```

## v10 修正

### 时间字段采用 RFC 3339

不再使用正则表达式描述 `yyyy-MM-dd HH:mm:ss`。

API 的 `createdAt`、`updatedAt`、`deletedAt` 使用 RFC 3339 / ISO 8601 字符串：

```json
{
  "createdAt": "2026-08-17T14:30:25.000Z"
}
```

前端负责根据用户语言、时区和 UI 需求转换为：

```text
2026-08-17 14:30:25
```

这样 API 与 OpenAPI 保持标准兼容，也避免自定义日期格式 regex。

### Scalar 中文

OpenAPI 配置保持：

```ts
scalar: {
  localization: {
    locale: "zh-CN";
  }
}
```

`scalar` 位于 `openapi({...})` 顶层，与 `documentation`、`mapJsonSchema` 同级。

### OpenAPI Zod 映射

保持：

```ts
mapJsonSchema: {
  zod: z.toJSONSchema;
}
```
