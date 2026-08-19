---
title: 开发流程 MCP
description: 配置并使用 lokgou 的项目开发流程 MCP 服务进行技术栈识别、任务路由和双模型编排。
---

# 开发流程 MCP

`@lokgou/dev-mcp` 是服务于项目开发流程的 stdio MCP 服务，不是业务 API，也不会打包进 `apps/api` 部署产物。

它提供三个工具：

- `analyze_project`：返回 workspace、模块技术栈和开发规则。
- `route_task`：用零 LLM 规则识别任务意图和工作阶段，推荐角色、模型层级，并列出相关模块与官方资料。
- `delegate_task`：按阶段调用独立配置中的 OpenAI-compatible 模型，生成编排计划、受限编码任务说明或审查报告。

## 本地配置

复制样例文件：

```bash
Copy-Item .ai/dev-mcp.config.example.json .ai/dev-mcp.config.json
```

填写 endpoint、模型名和 API key 环境变量名称：

```json
{
  "largeModel": {
    "baseUrl": "https://example.com/v1",
    "apiKeyEnv": "LOKGOU_DEV_MCP_LARGE_MODEL_API_KEY",
    "model": "orchestrator-model",
    "parameters": { "temperature": 0.2, "maxTokens": 8000 }
  },
  "smallModel": {
    "baseUrl": "https://example.com/v1",
    "apiKeyEnv": "LOKGOU_DEV_MCP_SMALL_MODEL_API_KEY",
    "model": "coding-model",
    "parameters": { "temperature": 0.1, "maxTokens": 4000 }
  },
  "roles": {
    "orchestrator": {},
    "code-gen": {},
    "validator": { "model": "validation-model", "parameters": { "temperature": 0 } },
    "summarizer": {},
    "translator": {}
  }
}
```

设置对应环境变量。`.ai/dev-mcp.config.json` 已被 Git 忽略，不能提交 API key。

## 角色模型回退

每个角色可以单独覆盖 `baseUrl`、`apiKeyEnv`、`model` 和 `parameters`。空对象代表直接使用默认模型：

- `orchestrator` 回退到 `largeModel`。
- `code-gen`、`validator`、`summarizer`、`translator` 回退到 `smallModel`。

角色 `parameters` 与默认模型参数合并。当前支持 `temperature` 和 `maxTokens`。

## 上下文预算

`delegate_task` 支持可选 `contextLevel`，用于控制实际发送给模型的仓库上下文，避免大模型输入被重复项目说明和无关模块占满：

- `minimal`：仅任务路由结果、相关模块路径、官方资料索引和调用方明确提供的路径；适合实现、校验和重新评估，且是这些阶段的默认值。
- `standard`：在 `minimal` 基础上增加与路由模块或指定路径重叠的 workspace 说明，以及少量任务相关规则；是 `planning` 的默认值。
- `full`：发送完整项目模块和规则；仅在跨 workspace 或架构工作确实需要全局背景时显式使用。

不要把完整 diff、工具日志或探索输出直接放进 `outcome`。先调用 `delegate_task` 并指定 `role: "summarizer"`、`contextLevel: "minimal"` 将它们压缩为变更文件、结论、风险和验证结果，再将摘要传给规划或重新评估。`maxTokens` 只限制模型输出，不能缩减输入上下文。

## 角色分工

| 角色           | 默认回退     | 作用与工作范围                                                                                                                       | 模型建议                                                                          |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `orchestrator` | `largeModel` | 理解全项目结构与子模块技术栈；读取官方上下文；拆分任务；负责架构、安全、认证、Prisma、公开 API、AutoCode、i18n、依赖选择与最终验收。 | 使用长上下文、强推理和稳定工具调用能力的高能力模型；低温度，例如 `0.1` 至 `0.3`。 |
| `code-gen`     | `smallModel` | 实现边界明确的 controller、service、Zod schema、测试、文档和机械重构；只修改分配的文件范围。                                         | 使用成本较低、代码生成和工具调用可靠的模型；低温度，例如 `0` 至 `0.2`。           |
| `validator`    | `smallModel` | 审查实现是否符合项目规则、检查类型/测试失败、核对 schema、路由、i18n 与文档一致性；默认不做架构决策。                                | 使用擅长静态分析和严格指令遵循的模型；温度建议 `0`。                              |
| `summarizer`   | `smallModel` | 压缩探索结果、日志、变更说明和子任务回报，为 orchestrator 节省上下文。                                                               | 使用快速、低成本的文本摘要模型；温度建议 `0` 至 `0.2`，较小 `maxTokens`。         |
| `translator`   | `smallModel` | 为现有 i18n 模块补充或校对语言字典；保持 key、占位符、术语和语气一致，不改变业务逻辑。                                               | 使用多语言能力稳定的低成本模型；温度建议 `0` 至 `0.2`。                           |

安全、数据库、公开 API、认证、AutoCode、i18n 架构与跨 workspace 任务即使由 worker 参与，也必须回到 `orchestrator` 审查和集成。

## 启动

```bash
bun run mcp
```

MCP 客户端应以 stdio 启动该命令。开发时使用：

```bash
bun run dev:mcp
```

这是 stdio 服务，不会监听 HTTP 端口，也不会在没有客户端连接时保持终端进程运行。因此，直接在终端执行 `bun run mcp` 时，标准输入到达 EOF 后进程会正常退出；这不表示服务启动失败。请通过 MCP 客户端启动它，或使用 Inspector 手动验证：

```bash
bunx @modelcontextprotocol/inspector bun packages/dev-mcp/src/index.ts
```

在 Inspector 中连接后，调用 `analyze_project` 或 `route_task` 验证服务。

MCP 客户端必须直接启动 `packages/dev-mcp/src/index.ts`，不要配置为 `bun run mcp`。后者会将 Bun 的脚本执行提示写入标准输出，破坏 stdio MCP 的 JSON-RPC 通信并导致客户端显示 `-32000: Connection closed`。

OpenCode 可一键安装或更新当前用户的 MCP 配置：

```bash
bun run mcp:install:opencode
```

该命令保留既有 OpenCode 配置字段，并追加或更新名为 `lokgou-dev` 的 MCP 条目。

## 客户端连接

`.ai/dev-mcp.client.example.json` 提供通用 stdio 连接样例。复制为 `.ai/dev-mcp.client.json` 并按本机路径调整，再将等价的 `command`、`args` 与 `cwd` 配置填入 Claude Code、Cursor、OpenCode 或 GitHub Copilot 的 MCP 设置。该文件同样被 Git 忽略，不应写入本机模型配置或凭据。

## 阶段与调度策略

`route_task` 是零 LLM 的规则路由：它只根据任务、路径和阶段给出推荐，不会调用模型。`route_task` 和 `delegate_task` 都接受可选的 `phase`；未传时默认为 `implementation`，并路由到 `code-gen` 与 `smallModel`。这是低成本优先策略，避免因任务包含 `Prisma`、`权限`、`路由` 等高风险关键词而隐式使用大模型。

大模型只保留给两种明确选择：调用方显式请求且阶段为 `planning`（默认路由至 `orchestrator`），或调用方显式传入 `role` 覆盖推荐角色。高风险关键词本身不构成大模型升级条件。

| 阶段             | 默认角色       | 默认模型层级 | 职责                                                                               |
| ---------------- | -------------- | ------------ | ---------------------------------------------------------------------------------- |
| `planning`       | `orchestrator` | `largeModel` | 设计、风险分析、官方上下文选择、子任务边界和验收标准。                             |
| `implementation` | `code-gen`     | `smallModel` | 在给定边界内实现 controller、service、schema、测试、文档或机械重构。               |
| `validation`     | `validator`    | `smallModel` | 检查实现或计划是否符合仓库规则，仅报告问题。                                       |
| `reassessment`   | `validator`    | `smallModel` | 根据已完成阶段和结果，以 JSON 返回下一阶段、推荐角色及是否需要 orchestrator 审查。 |

安全、认证、Prisma、公开 API、AutoCode、i18n、架构与跨 workspace 工作会在结果中标为 `requiresOrchestratorReview: true`。这表示需要由 orchestrator 做设计决策和最终集成，**不表示**其边界明确的实现子任务会离开 `code-gen` 与 `smallModel`。安全任务默认覆盖整个 `apps/`，因此未来管理后台、网站前端、Electron 与 UniApp workspace 都会纳入安全审查和编排范围。

每完成一个 `planning`、`implementation` 或 `validation` 阶段后，客户端都应调用 `delegate_task` 进入 `reassessment`，并传入原始 `task`、`completedPhase`（`planning`、`implementation` 或 `validation`）和 `outcome`。该阶段由 `validator` / `smallModel` 判断下一阶段、下一角色以及是否需要 orchestrator 审查；它不会自动调用大模型。

例如，先请求高风险工作设计，再将确定的编码范围交给小模型：

```json
{ "task": "设计部门数据权限", "phase": "planning" }
{ "task": "按已批准设计实现部门权限 service", "phase": "implementation", "contextLevel": "minimal" }
{ "task": "审查部门权限实现是否符合设计", "phase": "validation", "contextLevel": "minimal" }
```

完成实现后的重新评估调用示例：

```json
{
  "task": "按已批准设计实现部门权限 service",
  "phase": "reassessment",
  "completedPhase": "implementation",
  "outcome": "已完成 service 实现和相关测试；测试通过，未修改 Prisma schema。"
}
```

也可传入 `role` 显式覆盖推荐角色；应仅在调用方已明确该角色和工作边界时使用。完整协议在 `.ai/agent-orchestration.md`，官方技术资料索引在 `.ai/llms.txt`。
