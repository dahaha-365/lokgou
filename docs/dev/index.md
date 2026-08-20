---
title: 开发者文档
description: lokgou 的本地开发、代码质量、API 模块和脚手架指南。
---

# 开发者文档

本目录面向参与 lokgou 开发、维护和扩展的工程师。

## 文档导航

- [本地开发](./getting-started.md)：安装依赖、初始化数据库与启动服务。
- [代码质量与工具](./tooling.md)：格式化、Lint、类型检查、测试与 CI。
- [API 模块](./api-modules.md)：模块目录、路由注册与 admin 模块约定。
- [CRUD 抽象](./crud-abstractions.md)：使用函数组合复用标准 CRUD service，避免基类继承。
- [模块脚手架](./scaffolding.md)：创建顶级模块或子模块。
- [开发流程 MCP](./development-mcp.md)：项目分析、任务路由和双模型编排。

管理端 API 的权限目录、权限分配与有效权限使用说明，请参阅[管理端 API 访问](../user/admin-api.md)。

## 目录约定

```text
docs/
  dev/     开发者文档
  user/    用户与 API 使用者文档
```

新增文档应放入对应受众的目录，并在本目录或用户文档的入口页补充链接。
