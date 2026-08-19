export type TaskIntent =
  "architecture" | "security" | "database" | "api" | "frontend" | "documentation" | "coding";

const patterns: [TaskIntent, RegExp][] = [
  ["security", /auth|token|jwt|session|permission|secret|security|鉴权|认证|权限|密钥/i],
  ["database", /prisma|schema|migration|database|sqlite|seed|数据库|迁移|数据模型/i],
  ["api", /elysia|route|controller|openapi|scalar|endpoint|接口|路由/i],
  ["frontend", /vite|react|vue|nuxt|electron|uniapp|frontend|前端/i],
  ["documentation", /docs|documentation|readme|文档/i],
  ["architecture", /architecture|workspace|monorepo|dependency|设计|架构|依赖/i],
];

export function classifyIntent(task: string): TaskIntent {
  return patterns.find(([, pattern]) => pattern.test(task))?.[0] ?? "coding";
}
