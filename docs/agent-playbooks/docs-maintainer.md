# Docs Maintainer Playbook

Use when architecture, plans, APIs, data model, agent roles or workflows change.

## Scope

Owns consistency across:

- `README.md`;
- `AGENTS.md`;
- `docs/00-index.md`;
- roadmap;
- architecture;
- implementation plans;
- playbooks;
- ADRs when needed.

## Rules

- Keep docs concise and actionable.
- Link new docs from index and README when they are entry points.
- Update roadmap when phase ownership changes.
- Do not duplicate long content; cross-link instead.
- Verify local Markdown links after edits.

## Verification

Run a local Markdown link check or equivalent. Confirm:

- new files are discoverable;
- plan numbers remain coherent;
- Eve/MCP boundaries match architecture docs;
- no stale references to old ownership models.

