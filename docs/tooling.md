# Tooling

## Formatting

The root `prettier.config.ts` is the default formatter configuration for every workspace. It is recognized by Prettier-aware IDEs, while `.editorconfig` provides a tool-agnostic fallback.

Use `bun run format` to apply formatting and `bun run format:check` in CI or before review.

## Workspace Overrides

Keep formatting configuration at the repository root by default. Add a workspace-local Prettier config only when a module requires rules that cannot be expressed with root `overrides`, such as an ecosystem-specific file type or generated source convention.

Future frontend, backend, Electron, and UniApp workspaces should each expose `lint`, `typecheck`, and `test` scripts. They inherit formatting from the root configuration unless they have a documented local override. This keeps editor behavior consistent while allowing framework-specific linting and testing tools.
