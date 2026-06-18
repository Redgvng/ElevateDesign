# Open Design Canvas Agent Guide

## Mission

Build Open Design Canvas as a DesignSpec-first, open source, agentic UI design tool.

The product goal is not to clone Figma. The goal is to create a browser-based software design environment where users can generate, preview, organize, iterate, version, and export UI screens.

## Source of Truth

Read these before implementation:

1. `docs/00-index.md`
2. `docs/01-product-spec.md`
3. `docs/02-architecture.md`
4. `docs/03-tech-stack.md`
5. `docs/05-ai-pipeline.md`
6. `docs/11-roadmap.md`
7. `docs/14-subagent-operating-model.md`

The source of truth for generated interfaces is `DesignSpec`, not HTML or React. HTML and React are generated outputs.

## Operating Rules

- Keep Eve isolated as `apps/agent-runtime`; do not move product ownership into Eve.
- Keep the backend as owner of projects, jobs, screens, versions, artifacts, auth, and persistence.
- Keep MCP knowledge read-only by default.
- Use typed contracts and Zod validation for cross-boundary data.
- Treat all generated HTML/code as untrusted.
- Prefer small, testable changes aligned with the existing plan documents.
- Update docs when behavior or architecture changes.

## Required Workflow

For implementation work:

1. Select the relevant plan in `docs/plans/`.
2. Read the matching playbook in `docs/agent-playbooks/`.
3. Work on one bounded task at a time.
4. Add or update tests before claiming completion.
5. Run the verification commands listed in the plan.
6. Summarize changed files, verification results, and residual risk.

For review work:

1. Lead with findings.
2. Include file and line references.
3. Prioritize bugs, regressions, missing tests, security risk, and architecture drift.
4. If there are no findings, state that directly and mention remaining test gaps.

## Subagent Roles

Use `docs/14-subagent-operating-model.md` for the full roster and launch roadmap.

Core development roles:

- `orchestrator`
- `product-architect`
- `frontend-builder`
- `backend-builder`
- `data-modeler`
- `generation-pipeline-builder`
- `canvas-preview-builder`
- `eve-agent-runtime-builder`
- `mcp-knowledge-builder`
- `qa-reviewer`
- `security-reviewer`
- `docs-maintainer`

## Hard Boundaries

Do not:

- replace `DesignSpec` with raw HTML as source of truth;
- skip sandboxing generated UI;
- pass secrets into generated code or sandbox workspaces;
- let an agent mutate product data except through explicit backend tools/routes;
- merge broad refactors into feature tasks;
- start Figma/collaboration/import-codebase work before the MVP loop is stable.

