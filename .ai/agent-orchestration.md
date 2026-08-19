---
name: lokgou-orchestrator
description: Orchestrates repository work with a capable planning model and delegates bounded implementation tasks to a coding model.
version: 1
roles:
  orchestrator: large-model
  coder: small-model
---

# lokgou Agent Orchestration

## Purpose

Use a capable model as the orchestrator for repository understanding, task decomposition, architecture decisions, official-context selection, review, and final verification. Delegate bounded, low-ambiguity implementation tasks to a smaller coding model.

This is a tool-neutral specification. A development tool may map `orchestrator` and `coder` to its own primary-agent and subagent features. Do not commit provider names, API keys, or tool-specific configuration to this repository.

## Orchestrator Protocol

1. Read `AGENTS.md`, then the relevant `docs/dev` or `docs/user` pages.
2. Read `.ai/llms.txt` and load only the official framework context required by the task. Read `.ai/full-llms.txt` only for cross-cutting work.
3. Inspect affected modules, schemas, database models, tests, and existing worktree changes before deciding implementation.
4. Split work only when tasks have clear file boundaries and can be independently verified.
5. Delegate coding tasks with explicit file scope, acceptance criteria, applicable project rules, and required validation commands.
6. Keep security, authentication, database schema changes, API contracts, business identifiers, i18n, and architecture decisions under orchestrator review. For every public API change, review OpenAPI operation details, `apps/api/src/app.ts` tag declarations, and `x-tagGroups` as one atomic contract.
7. Review delegated changes against the project rules. Resolve conflicts, update documentation, verify the API contract checklist in `docs/dev/api-modules.md`, and run `bun run quality` before completion.

## Coder Protocol

1. Read the task-specific files and rules supplied by the orchestrator.
2. Do not alter files outside the assigned scope unless required to fix a direct compile or test failure; report broader changes instead.
3. Follow local project conventions for Zod contracts, Elysia composition, Prisma transactions, i18n, AutoCode, and documentation.
4. Verify with the smallest relevant command, then report changed files, results, and unresolved concerns to the orchestrator.

## Delegation Guide

Delegate to the coding model:

- Isolated controller, service, schema, test, documentation, or formatting changes.
- Mechanical refactors after the orchestrator defines exact behavior.
- Focused test additions and simple bug fixes with clear reproduction steps.

Keep with the orchestrator:

- Cross-module design and dependency selection.
- Authentication, authorization, session management, secrets, and security reviews.
- Prisma schema and migration strategy.
- Public API and OpenAPI contract changes.
- AutoCode rule semantics, localization architecture, and CI/workspace architecture.
- Final integration, review, and quality validation.

## Required Completion Criteria

- Shared contracts are updated before API implementation when applicable.
- New or renamed OpenAPI tags are registered in both `documentation.tags` and the appropriate `x-tagGroups` entry in `apps/api/src/app.ts`.
- User-visible behavior, routes, configuration, or workflows have matching documentation updates.
- No unrelated worktree changes are reverted.
- `bun run quality` passes unless the orchestrator explicitly reports a blocker.
