---
title: 管理端 API 访问
description: 调用 lokgou Admin API 时的路由前缀与 admin-app-key 鉴权要求。
---

# 管理端 API 访问

管理端接口默认位于 `/admin` 前缀下：

```text
/admin/users
/admin/departments
/admin/departments/leader
/admin/roles
/admin/permissions
/admin/menus
/admin/dicts
/admin/attachments
/admin/auth/login
```

部署者可通过 `ADMIN_PREFIX` 修改前缀。

## 鉴权

每一个管理端请求都必须包含 `admin-app-key` 请求头，其值必须与服务端的 `ADMIN_APP_KEY` 一致。

```bash
curl http://localhost:3000/admin/users \
  --header "admin-app-key: <your-admin-app-key>"
```

缺少或错误的 key 会返回：

```json
{
  "message": "无效的 admin-app-key",
  "code": "ADMIN_UNAUTHORIZED"
}
```

该 key 仅用于管理端应用访问，不等同于未来用户登录、会话或用户权限认证。

## 用户认证

管理用户使用 `POST /admin/auth/login` 获取短期 access token 与 refresh token。后续受保护的会话接口使用：

```http
admin-authorization: <access-token>
```

- `POST /admin/auth/refresh`：使用 refresh token 轮换 token。
- `GET /admin/auth/sessions`：查看当前用户未过期的登录会话。
- `DELETE /admin/auth/sessions/:id`：退出指定会话；该会话的 access token 会立即失效。

服务端必须配置 `JWT_SECRET`。refresh token 只以哈希形式保存在数据库中，且每次刷新都会轮换。

token 请求头名称可通过 `ADMIN_AUTHORIZATION_HEADER` 配置，默认值为 `admin-authorization`。服务端也兼容该 header 的 `Bearer <access-token>` 写法。

## 权限目录、分配与有效权限

`/admin/permissions` 是权限目录及权限分配的管理接口。权限目录项包含稳定的 `code`、名称、分类、动作、资源（`subject`）、数据范围和启用状态，可创建、查询、修改和软删除；列表支持按分类、动作、资源、范围和启用状态筛选。

权限分类（`category`）用于描述授权对象：

- `menu`：菜单可见性；
- `route`：前端路由访问；
- `api`：API 资源操作；
- `button`：页面按钮或操作；
- `data`：数据访问。

动作（`action`）为 `read`、`create`、`update`、`delete`、`manage` 或 `access`。范围（`scope`）为：`all`（全部数据）、`owner`（当前用户拥有的数据）或 `manager`（当前用户作为部门负责人的部门数据）。`allow` 表示允许，`deny` 表示拒绝；在同一权限代码有多个来源时，最终效果以优先级更高的分配为准。

可通过以下接口向不同目标分配或移除权限，`PUT` 请求体为 `{ "effect": "allow" }` 或 `{ "effect": "deny" }`：

- 直接用户：`/admin/permissions/users/:userId/:permissionId`；
- 用户角色分配：`/admin/permissions/user-roles/:userRoleId/:permissionId`；
- 部门角色：`/admin/permissions/department-roles/:departmentRoleId/:permissionId`；
- 全局角色：`/admin/permissions/roles/:roleId/:permissionId`。

使用 `GET /admin/permissions/users/:userId/effective` 查询用户的有效权限及其来源。优先级严格为：**直接用户 > 用户角色分配 > 部门角色 > 全局角色（兜底）**。因此，高优先级来源的 `allow` 或 `deny` 都会覆盖同一权限代码的低优先级结果。

数据范围规则由 CASL Prisma 应用：`all` 不附加数据条件，`owner` 限制为当前用户拥有的数据，`manager` 限制为当前用户担任部门负责人的部门数据。当前已在用户资源的列表、详情、修改和删除查询中执行这些 Prisma 条件；其他业务资源接入时应在其 Prisma 查询中使用同一能力的 `accessibleBy(...).ofType(...)` 条件，不能仅依赖路由级检查。

## 菜单

`/admin/menus` 管理不同系统位置的菜单配置。每条菜单以 `group` 标识其使用位置，并通过 `type` 区分三类项目：`group`（菜单组）、`menu`（菜单）和 `button`（按钮）。菜单可通过 `parentId` 形成同一 `group` 内的层级；删除含有可用子项的菜单会被拒绝。

菜单必须填写 `permissionCode`，并且该标识必须对应一个已启用的权限目录项。权限可照常通过直接用户、用户角色、部门角色或全局角色分配。

以下接口都必须通过必填的 `group` 查询参数指定菜单使用位置；可选的 `keyword` 会按菜单编码或名称搜索。接口返回该分组中最终拥有 `allow` 权限的已启用菜单（按排序值排列）：

- `GET /admin/menus/effective?group=<group>&keyword=<keyword>`：当前 access token 对应用户；
- `GET /admin/menus/users/:userId/effective?group=<group>&keyword=<keyword>`：指定用户。

## 角色与部门角色

`/admin/roles` 管理全局角色。可通过 `/admin/roles/:id/users/:userId` 为用户分配或移除全局角色；全局角色的权限请通过 `/admin/permissions/roles/:roleId/:permissionId` 管理。

当同一角色在不同部门需要不同权限时，使用 `/admin/roles/:id/departments/:departmentId` 配置部门角色：

- `grantedPermissions`：在角色基础权限外增加的权限；
- `revokedPermissions`：从角色基础权限中移除的权限。

然后通过 `/admin/roles/:id/departments/:departmentId/users/:userId` 分配该部门角色。分配记录包含开始和结束时间；结束原部门角色后再分配新部门角色，可保留用户调动的历史。部门角色的权限请通过 `/admin/permissions/department-roles/:departmentRoleId/:permissionId` 管理。

## 自动编号

创建用户时可省略 `username`，系统会自动生成 `USR000001` 格式的登录名。创建部门时可省略 `code`，系统会自动生成 `DEP000001` 格式的部门编码。

管理员可通过 `/admin/system/autocode/rules` 管理编码规则。规则必须填写业务键、前缀、计数器长度和备注；中段模板可以为空，也可以包含固定含义字符与日期占位符：`{YYYY}`、`{YY}`、`{MM}`、`{DD}`。例如前缀 `DEP-`、中段 `OPS-{YYYYMM}-`、长度 `4` 会生成 `DEP-OPS-202608-0001`。

## 数据字典

`/admin/dicts` 管理可复用的系统数据字典。字典类型包含唯一的 `code`、名称、说明与启用状态；类型编码创建后保持不变。字典项通过 `/admin/dicts/:id/items` 管理，包含显示名称 `label`、唯一值 `value`、排序值、说明和启用状态。类型和字典项均支持创建、分页查询、详情、修改与软删除；删除仍包含可用字典项的类型会返回 `DICT_HAS_ITEMS`。

## 附件

`/admin/attachments` 管理系统附件及其分类、标签等业务元数据。使用 `multipart/form-data` 向 `POST /admin/attachments` 提交 `file`，并可选提交 `category` 和 `tags`；每个附件由 `ATTACHMENT` 自动编码规则生成业务编号。

- `GET /admin/attachments`：按文件名、业务编号、分类或标签分页查询；
- `GET`、`PATCH`、`DELETE /admin/attachments/:id`：查看、整理或软删除附件元数据；
- `GET /admin/attachments/:id/download`：下载附件原始内容。

文件名、MIME 类型、大小、分类和标签会持久化到数据库；实际文件由服务端存储在 `ATTACHMENT_STORAGE_PATH` 下的 `YYYY/MM/DD` 子目录，数据库仅保存内部存储引用，不向 API 响应暴露物理路径。删除为软删除，文件字节会保留以支持后续受控清理或恢复。

部署者可通过 `ATTACHMENT_MAX_SIZE` 配置单文件最大字节数（默认 10 MiB），并通过 `ATTACHMENT_ALLOWED_MIME_TYPES` 配置允许的 MIME 类型，例如 `image/*,application/pdf`；未设置 MIME 类型配置时允许所有类型。

## 操作审计

所有成功的管理端资源创建、修改、分配和删除操作都会记录实际 access token 对应的操作用户、请求方法、资源和路径。操作人由服务端鉴权上下文确定，客户端不能指定或覆盖。

本地开发环境执行 `bun run db:seed` 后可使用 `admin` / `admin123456` 测试登录。该账号是用于初始化权限体系的引导超级管理员；普通管理用户必须先获得权限分配后才能访问受保护的管理资源。该账号仅用于演示，禁止用于生产环境。
