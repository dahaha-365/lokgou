---
title: CRUD 模块与 Prisma 模型能力
description: 说明 lokgou 的可扩展 CRUD service、Prisma 扩展、模型能力声明和自动路由契约。
---

# CRUD 模块与 Prisma 模型能力

## 设计目标

项目使用函数组合，而不是 service/controller 基类：

- `createCrudService` 负责标准 service 能力；
- `createCrudModule` 负责覆盖标准方法和追加业务方法；
- Prisma model 实例由 service 初始化时注入，并在 service 内共享；
- controller 仍由 Elysia、Zod、序列化、本地化和 OpenAPI 元数据显式组合；
- 只有显式写入路由契约的方法才会自动注册为 HTTP 路由。

CRUD 抽象不隐藏事务、权限、自动编码和资源特有的查询条件。

## Prisma 客户端与扩展

`apps/api/src/lib/prisma.ts` 创建 Prisma 客户端并组合项目扩展。扩展位于：

```text
apps/api/src/lib/prisma/extends/
```

可复用扩展应使用 `Prisma.defineExtension` 导出。例如软删除扩展位于
`prisma/extends/soft-delete.ts`。业务 service 从 `@api/lib/prisma` 导入唯一的
`prisma` 实例，然后按需加载扩展：

```ts
const positionPrisma = prisma.$extends(softDeleteExtension);
```

`$extends` 只产生同一个底层 client 的类型化代理，不会创建第二个数据库实例。
业务代码禁止自行 `new PrismaClient()`。

## 模型能力声明

模型能力集中声明在 `apps/api/src/lib/model-capabilities.ts`：

```ts
export const modelCapabilities = {
  Position: { softDeletes: true },
} satisfies Partial<Record<Prisma.ModelName, ModelCapability>>;
```

`satisfies` 保证模型名称必须来自 Prisma schema。新增模型能力时，应同时确认模型
确实具备对应字段和数据库语义。扩展通过能力声明判断模型是否支持软删除，不要在
扩展内部重新维护模型名称列表。

## 创建 CRUD service

新 service 推荐使用 `createCrudServiceFromModel`，显式传入已扩展的 model：

```ts
const service = createCrudServiceFromModel<
  typeof positionPrisma.position,
  Position,
  PositionCreate,
  PositionUpdate,
  PositionQuery,
  PositionListResult
>({
  model: positionPrisma.position,
  create(data) {
    return this.model.create({ data });
  },
  show(id) {
    return this.model.findFirst({ where: { id } });
  },
  update(id, data) {
    return this.model.update({ where: { id }, data });
  },
  list(params) {
    return list(params);
  },
});
```

工厂会自动提供标准 `delete(id)`，并调用注入的 model：

```ts
service.delete(id);
```

因此删除语义由 Prisma model 能力决定：声明 `softDeletes: true` 的模型会将
`delete` 转换为更新 `deletedAt`；没有该能力的模型执行物理删除。service 不应再
定义名为 `softDelete` 的顶级标准方法。

旧的 `createCrudService(adapter)` 仍可用于尚未迁移的简单模块，但新增模块应优先
使用带 `model` 的初始化方式，以确保标准 delete 与扩展 model 共享同一实例。

## 软删除能力

软删除模型的默认行为由 Prisma 扩展提供：

- `delete`：设置 `deletedAt`，不物理删除；
- `deleteMany`：对匹配记录设置 `deletedAt`；
- `findFirst`、`findMany`、`findUnique`、`count`：默认排除已删除记录。

资源如果需要恢复或后台回收站能力，应在模块中追加明确方法：

- `restore(id)`：将 `deletedAt` 清空；
- `forceDelete(id)`：使用同一个全局 `prisma` 实例的原生 model 物理删除；
- `withTrashed(query)`：查询全部记录；
- `onlyTrashed(query)`：只查询已删除记录。

这些方法是业务扩展，不会因为存在于 service 中就自动成为 HTTP API。

## createCrudModule 扩展

使用 `createCrudModule` 覆盖标准方法或追加业务方法：

```ts
export const positionService = createCrudModule(service, {
  listEnabled: () => service.list({ page: 1, pageSize: 100, enableState: 1 }),
  restore: (id) => restorePosition(id),
});
```

覆盖方法必须保持原方法的输入和返回类型。扩展方法应保持资源特有逻辑可见，避免
为了复用而把权限、事务或 Prisma 查询条件隐藏到通用工厂中。

## 自动路由契约

自动路由使用 `CrudRouteContract`，每个条目必须指定 service method key 和注册函数：

```ts
const contract: CrudRouteContract<typeof service, RouteService> = [
  {
    serviceMethod: "delete",
    register: (service) =>
      new Elysia().delete("/:id", ({ params }) => service.delete(params.id), {
        params: PositionIdSchema,
        response: SuccessResponseSchema,
      }),
  },
];
```

只有契约中声明的方法会注册路由。`restore`、`forceDelete`、`withTrashed` 和
`onlyTrashed` 默认应保持内部 service 能力，除非产品明确要求公开对应 API。

注册函数内部创建自己的 Elysia plugin，以便 Zod schema 在具体路由处推导
`body`、`params` 和 `query`。通用 CRUD 工厂不负责推断资源响应、错误、本地化、权限
或 OpenAPI 细节，这些内容必须留在 controller/route contract 边界。

## 开发约束

- 使用 `@api/lib/*` 和模块隔离的 `@api/admin/*` 别名，避免深层相对路径；
- service 使用已扩展的 `prisma` model，不要重复创建 Prisma client；
- 标准删除方法统一命名为 `delete`，不要新增 `softDelete` 标准方法；
- 物理删除必须显式命名为 `forceDelete`，并谨慎控制调用范围；
- 所有新增 API 仍需使用共享 Zod contract、i18n、权限和 OpenAPI metadata；
- 修改 CRUD 抽象或模型能力后运行 `bun run quality`。
