# Subagent Development Organization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the subagent operating model, role playbooks, launch roadmap, and root guidance needed to build the MVP with managed specialist agents.

**Architecture:** A root `AGENTS.md` gives repo-wide instructions. `docs/14-subagent-operating-model.md` defines roles, launch sequence, review gates, and parallelization policy. `docs/agent-playbooks/` contains concise role-specific procedures used by development and review agents.

**Tech Stack:** Markdown, Codex subagents, Eve agent planning, project docs, local link verification.

---

## Files

- Create: `AGENTS.md`
- Create: `docs/14-subagent-operating-model.md`
- Create: `docs/agent-playbooks/orchestrator.md`
- Create: `docs/agent-playbooks/product-architect.md`
- Create: `docs/agent-playbooks/frontend-builder.md`
- Create: `docs/agent-playbooks/backend-builder.md`
- Create: `docs/agent-playbooks/data-modeler.md`
- Create: `docs/agent-playbooks/generation-pipeline-builder.md`
- Create: `docs/agent-playbooks/canvas-preview-builder.md`
- Create: `docs/agent-playbooks/eve-agent-runtime-builder.md`
- Create: `docs/agent-playbooks/mcp-knowledge-builder.md`
- Create: `docs/agent-playbooks/generator.md`
- Create: `docs/agent-playbooks/critic.md`
- Create: `docs/agent-playbooks/exporter.md`
- Create: `docs/agent-playbooks/mcp-usage.md`
- Create: `docs/agent-playbooks/qa-reviewer.md`
- Create: `docs/agent-playbooks/security-reviewer.md`
- Create: `docs/agent-playbooks/docs-maintainer.md`
- Modify: `README.md`
- Modify: `docs/00-index.md`
- Modify: `docs/11-roadmap.md`
- Modify: `docs/plans/08-knowledge-mcp.md`

## Tasks

- [ ] Create root `AGENTS.md` with repo-wide agent instructions.
- [ ] Create `docs/14-subagent-operating-model.md`.
- [ ] Define the subagent roster and responsibilities.
- [ ] Define the launch roadmap from Phase 0 through Phase 8.
- [ ] Define launch prompts, review protocol and parallelization policy.
- [ ] Create role playbooks in `docs/agent-playbooks/`.
- [ ] Link playbooks from the index and README.
- [ ] Update roadmap to reference the subagent organization phase.
- [ ] Update MCP plan so the knowledge catalog includes playbooks and `AGENTS.md`.
- [ ] Verify all local Markdown links.

## Verification

Run:

```bash
node scripts/check-markdown-links.js
```

If no script exists yet, run an equivalent local Markdown link check.

Expected:

- all new docs are linked;
- role names match across operating model, playbooks and plans;
- no local Markdown links are broken.

## Exit Criteria

The project has a clear operating model for launching specialist subagents across the MVP roadmap, with role-specific playbooks and review gates documented before implementation starts.
