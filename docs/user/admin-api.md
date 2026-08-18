---
title: 管理端 API 访问
description: 调用 lokgou Admin API 时的路由前缀与 admin-app-key 鉴权要求。
---

# 管理端 API 访问

管理端接口默认位于 `/admin` 前缀下：

```text
/admin/users
/admin/departments
/admin/department-leaders
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

## 自动编号

创建用户时可省略 `username`，系统会自动生成 `USR000001` 格式的登录名。创建部门时可省略 `code`，系统会自动生成 `DEP000001` 格式的部门编码。

管理员可通过 `/admin/system/autocode/rules` 管理编码规则。规则必须填写业务键、前缀、计数器长度和备注；中段模板可以为空，也可以包含固定含义字符与日期占位符：`{YYYY}`、`{YY}`、`{MM}`、`{DD}`。例如前缀 `DEP-`、中段 `OPS-{YYYYMM}-`、长度 `4` 会生成 `DEP-OPS-202608-0001`。

本地开发环境执行 `bun run db:seed` 后可使用 `admin` / `admin123456` 测试登录。该账号仅用于演示，禁止用于生产环境。
