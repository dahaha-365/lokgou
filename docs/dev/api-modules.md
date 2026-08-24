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

具有 `parentId` 层级的资源可提供 `/tree` 查询。树扩展支持 `rootId`（缺省或
`null` 返回顶层根；指定值返回该节点及其后代），并通过复制记录添加 `children`，不会修改
Prisma 返回对象；检测到循环时会停止继续展开该分支。

## OpenAPI

子模块 controller 应声明自己的资源 tag，例如 `Users`、`Departments`。**新增、重命名或删除资源 tag 时，必须在同一变更中更新 `apps/api/src/app.ts` 的 `documentation.tags` 和 Admin `x-tagGroups`**，否则接口虽会出现在原始 OpenAPI 规范中，却不会获得正确的 Scalar 描述和分组。

提交 API 变更前按以下清单复核：

- 共享 Zod 请求、响应和错误 contract 已在 `packages/schemas/src` 定义并导出；
- 每个路由均有 `detail.tags`、`detail.summary` 与完整状态码 response map；
- 每个新增 tag 同时加入 `documentation.tags` 与对应的 `x-tagGroups`；
- 用户文档已更新，并通过 `bun run quality` 验证。

## 业务编号

`src/lib/identifier.ts` 提供通用编号生成器：必填前缀、可选中段和指定长度的计数器组成编号。例如：

```ts
createIdentifier({ prefix: "DEP-", middle: "OPS-", counter: 42, length: 6 });
// DEP-OPS-000042
```

计数器由 `admin/system/autocode` 规则模块持久化管理。规则按业务键和渲染后的中段独立计数，可在事务中安全递增。用户未传 `username` 时读取 `USERNAME` 规则；部门未传 `code` 时读取 `DEPARTMENT_CODE` 规则。未配置规则时不会生成编码，并返回 `AUTOCODE_RULE_REQUIRED`。

## 附件上传

业务模块需要保存 `File` 时，调用 `apps/api/src/modules/admin/attachments/attachment.service.ts` 导出的 `uploadAttachment`，不要直接使用 `Bun.write`。该方法统一生成 `ATTACHMENT` 自动编码、按 `ATTACHMENT_STORAGE_PATH/YYYY/MM/DD` 写入文件、净化原始文件名、持久化分类与标签，并在数据库写入失败时回收已写入的文件。

```ts
import { uploadAttachment } from "../attachments/attachment.service";

const attachment = await uploadAttachment(file, {
  category: "invoice",
  tags: ["finance", "2026"],
});
```

返回值是 Prisma `Attachment` 记录；调用者应保存 `attachment.id` 关联业务数据，不能保存或暴露内部 `storagePath`。

上传方法会同时执行 `ATTACHMENT_MAX_SIZE`（字节，默认 10 MiB）和 `ATTACHMENT_ALLOWED_MIME_TYPES`（逗号分隔，支持 `image/*`，默认 `*`）限制；其他模块不得绕过该方法或自行实现不同的文件限制。

## 操作人审计

所有通过已认证 Admin API 执行的成功 `POST`、`PUT`、`PATCH` 与 `DELETE` 操作，都会自动写入 `AdminOperationLog`。日志以 `actorId` 外键关联实际 access token 对应的 `User`，并记录 HTTP 方法、顶级资源与规范化请求路径；操作人不来自请求体或客户端请求头，因此业务模块不得自行接收或伪造操作人字段。

认证路由不记录为资源 CRUD 操作。日志记录由 admin 顶级 guard 在业务 handler 成功后统一处理，新 CRUD 子模块通过 `admin/routes.ts` 挂载即可继承该行为。普通顶级资源变更会自动分配目标资源和目标记录 ID 元数据；内部模块需要记录非标准操作时，可调用 `system/audit-logs/audit-log.service.ts` 的 `recordOperation` 并显式提供目标元数据。已经由 HTTP 变更自动记录时不得重复调用该方法。业务模块可调用同一服务的 `listRecordOperations` 获取记录历史，或调用 `recordOperators(resource, recordId)` 获取安全的 `createdBy` 与 `updatedBy` 显示数据；两者都只返回操作人的 ID、用户名、姓名和 `displayName`。
