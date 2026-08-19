const modules = [
  {
    path: "apps/api",
    stack: ["Bun", "Elysia", "Prisma", "Zod", "Scalar"],
    role: "API and admin services",
  },
  { path: "packages/schemas", stack: ["TypeScript", "Zod"], role: "Shared API contracts" },
  {
    path: "docs",
    stack: ["Markdown", "Nuxt Content/VitePress compatible frontmatter"],
    role: "Developer and user documentation",
  },
];

export function projectContext() {
  return {
    modules,
    rules: [
      "Read AGENTS.md and focused .ai/llms.txt context before framework changes.",
      "Use persisted AutoCode rules for business identifiers.",
      "Use module and locale specific runtime messages; zh-CN is the fallback.",
      "Run bun run quality after changes.",
    ],
  };
}
