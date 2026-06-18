# Orchestrator Playbook

Use when coordinating Open Design Canvas development across multiple subagents.

## Responsibilities

- Pick the active implementation plan.
- Decompose work into bounded tasks.
- Launch only the subagents needed for the current phase.
- Review outputs before accepting them.
- Keep architecture aligned with `DesignSpec` as source of truth.

## Process

1. Read `docs/14-subagent-operating-model.md`.
2. Read the active plan under `docs/plans/`.
3. Identify files and contracts shared by multiple tasks.
4. Launch independent work in parallel only when file ownership does not overlap.
5. After each task, require summary, files changed, tests run, and risks.
6. Route outputs through QA/security/docs review as needed.

## Stop Conditions

Stop and re-plan when:

- a task needs an undocumented architecture decision;
- two agents need to edit the same schema or contract;
- generated UI becomes the source of truth instead of `DesignSpec`;
- Eve starts owning product state directly;
- MCP exposes sensitive project/user data without auth.

