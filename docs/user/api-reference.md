---
title: API 参考
description: 使用 Scalar 和 OpenAPI JSON 查看、调试 lokgou API。
---

# API 参考

服务启动后，可通过以下地址查看接口文档：

- Scalar：`http://localhost:3000/openapi`
- OpenAPI JSON：`http://localhost:3000/openapi/json`

Scalar 会将管理端资源显示在 `Admin` 分组下，并按 Auth、Users、Departments、Department Leaders 分类。

使用 Scalar 的请求调试功能前，先在认证设置中填写 `admin-app-key`，或在请求头中手动添加该字段。

Scalar 会保存已输入的 `admin-app-key` 与 access token，并自动附加到匹配安全方案的请求。登录后请将响应中的 `accessToken` 粘贴到 Scalar 的 `AdminAccessToken` 认证设置中；该方案使用服务端配置的 token header 名称，默认是 `admin-authorization`。
