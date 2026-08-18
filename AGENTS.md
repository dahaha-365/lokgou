# lokgou AI Development Guide

Before changing code, read the documentation relevant to the task:

- `.ai/llms.txt`: focused official framework context index.
- `.ai/full-llms.txt`: cross-cutting architecture context.

- `docs/dev/index.md`: developer documentation entry point.
- `docs/dev/getting-started.md`: local setup and common commands.
- `docs/dev/tooling.md`: formatting, linting, tests, and CI requirements.
- `docs/dev/api-modules.md`: API module structure, routing, guards, and OpenAPI conventions.
- `docs/dev/scaffolding.md`: commands for creating API modules and submodules.
- `docs/user/index.md`: user documentation entry point.
- `docs/user/admin-api.md`: Admin API route prefix and `admin-app-key` requirements.
- `docs/user/api-reference.md`: Scalar and OpenAPI reference usage.

## Working Rules

- Use Bun for runtime, dependencies, scripts, and tests: `bun install`, `bun add`, `bun run`, and `bun:test`.
- Use functional Elysia plugin composition with `.use()` and `.guard()`; do not add class-based controllers.
- Keep shared Zod request and response contracts in `packages/schemas/src` before implementing routes.
- Treat `apps/api/prisma/schema.prisma` as the database source of truth. Use `prisma.$transaction()` for dependent multi-write operations.
- Preserve integer Prisma IDs and matching positive-integer API schemas.
- Admin routes require `admin-app-key` and, except `/admin/auth/login`, an access token in `ADMIN_AUTHORIZATION_HEADER`.
- Keep runtime business messages in `apps/api/src/lib/i18n/<locale>/<module>/`. Zod validation uses `zod/locales`; `zh-CN` is the default locale.
- Generate business identifiers only through persisted `admin/system/autocode` rules and counters.
- Keep developer-facing documentation in `docs/dev` and user-facing documentation in `docs/user`.
- Add YAML frontmatter with `title` and `description` to every new documentation page.
- Update relevant documentation whenever behavior, API routes, configuration, or developer workflows change.
- For API modules, preserve the `apps/api/src/modules/<top-level-module>` structure and register child routes through the parent `routes.ts` plugin.
- Prefer the scaffold commands in `docs/dev/scaffolding.md` when adding API modules.
- Run `bun run quality` after code changes.

## Official Context

- Read `.ai/llms.txt` to identify the smallest relevant official framework source before using Bun, Elysia, Prisma, Zod, Scalar, or Faker APIs.
- Read `.ai/full-llms.txt` only for architecture, dependency upgrades, or new workspace/framework decisions.
- Never guess framework signatures. Verify against official documentation and installed package types.
