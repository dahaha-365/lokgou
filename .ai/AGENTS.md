# lokgou AI Context

Read `../AGENTS.md` first; it is the repository-wide authority.

## Project Facts

- Runtime, package manager, and test runner: Bun. Use `bun install`, `bun add`, `bun run`, and `bun:test`.
- API: Elysia 1.x functional plugins under `apps/api/src/modules/<top-level-module>`.
- Database: Prisma 7, SQLite, and `@prisma/adapter-libsql`. The schema is `apps/api/prisma/schema.prisma`; the singleton is `apps/api/src/lib/prisma.ts`.
- Contracts: Zod 4 schemas in `packages/schemas/src`.
- API docs: `@elysia/openapi` and Scalar.
- Quality: Prettier, ESLint, strict TypeScript, and `bun run quality`.

## Conventions

- Use Elysia `.use()` and `.guard()` composition; do not add class-based controllers.
- Add Zod request/response contracts before implementing a route.
- Keep integer Prisma IDs and matching positive-integer API schemas.
- Use `prisma.$transaction()` for dependent multi-write operations.
- Admin routes require `admin-app-key` and, except `/admin/auth/login`, an access token in `ADMIN_AUTHORIZATION_HEADER`.
- Runtime business messages use `src/lib/i18n/<locale>/<module>/`; Zod validation uses `zod/locales`. Default locale: `zh-CN`.
- Business identifiers are generated only through persisted `admin/system/autocode` rules and counters.
- Use `bun run scaffold:module` or `bun run scaffold:submodule` for API modules.

## Context Loading

- Read `.ai/llms.txt` to locate focused official docs before using framework APIs.
- Read `.ai/full-llms.txt` only for architecture, dependency upgrades, or new workspace/framework decisions.
- Never guess framework signatures. Verify against official docs and installed package types.
