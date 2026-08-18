# lokgou AI Development Guide

Before changing code, read the documentation relevant to the task:

- `.ai/AGENTS.md`: AI-specific project facts and conventions.
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

- Keep developer-facing documentation in `docs/dev` and user-facing documentation in `docs/user`.
- Add YAML frontmatter with `title` and `description` to every new documentation page.
- Update relevant documentation whenever behavior, API routes, configuration, or developer workflows change.
- For API modules, preserve the `apps/api/src/modules/<top-level-module>` structure and register child routes through the parent `routes.ts` plugin.
- Prefer the scaffold commands in `docs/dev/scaffolding.md` when adding API modules.
- Run `bun run quality` after code changes.
