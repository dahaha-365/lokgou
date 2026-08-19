---
title: Agent Tool Adapters
description: Discovery adapters that expose the tool-neutral lokgou agent protocol to supported development tools.
---

# Agent Tool Adapters

The canonical orchestration behavior is `.ai/agent-orchestration.md`. The following thin adapters make it discoverable by common development tools:

- Claude Code: `.claude/agents/`
- Cursor: `.cursor/agents/`
- OpenCode: `.opencode/agent/`
- GitHub Copilot: `.github/agents/`

Each adapter defines `lokgou-orchestrator` and `lokgou-coder`. They intentionally omit provider names, model IDs, API keys, and runtime configuration. Select the capable model for the orchestrator and the lower-cost coding model in the host tool.

CCSwitch may be used locally to switch model-provider credentials for compatible CLI tools, but its configuration and credentials must remain outside this repository. It does not replace the agent protocol or these discovery adapters.
