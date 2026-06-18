# Eve Agent Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated Eve runtime that orchestrates Open Design Canvas generation, critique, repair, variants, and exports through typed tools and specialist subagents.

**Architecture:** Eve runs as a separate `apps/agent-runtime` app inside the workspace. The product backend remains the source of truth for projects, jobs, screens, versions, artifacts, and auth. Eve tools call stable backend/internal package contracts and return bounded model-facing summaries.

**Tech Stack:** Eve, TypeScript, Node 24, Zod, Vercel AI Gateway or provider SDKs, Eve tools/skills/subagents/sandbox/evals, existing API/backend packages.

---

## Context

Read before implementation:

- [Eve integration reference](../13-eve-agent-framework.md)
- [Architecture](../02-architecture.md)
- [AI pipeline](../05-ai-pipeline.md)
- [API contracts](../10-api-contracts.md)
- [Knowledge MCP plan](08-knowledge-mcp.md)

## Files

- Create: `apps/agent-runtime/package.json`
- Create: `apps/agent-runtime/agent/agent.ts`
- Create: `apps/agent-runtime/agent/instructions.md`
- Create: `apps/agent-runtime/agent/channels/eve.ts`
- Create: `apps/agent-runtime/agent/connections/odc_knowledge.ts`
- Create: `apps/agent-runtime/agent/lib/odc-api-client.ts`
- Create: `apps/agent-runtime/agent/lib/idempotency.ts`
- Create: `apps/agent-runtime/agent/lib/model-output.ts`
- Create: `apps/agent-runtime/agent/tools/get_project_context.ts`
- Create: `apps/agent-runtime/agent/tools/validate_design_spec.ts`
- Create: `apps/agent-runtime/agent/tools/compile_preview.ts`
- Create: `apps/agent-runtime/agent/tools/render_screenshot.ts`
- Create: `apps/agent-runtime/agent/tools/create_screen_version.ts`
- Create: `apps/agent-runtime/agent/tools/create_variants.ts`
- Create: `apps/agent-runtime/agent/tools/prepare_export.ts`
- Create: `apps/agent-runtime/agent/skills/design-spec-authoring.md`
- Create: `apps/agent-runtime/agent/skills/visual-critique.md`
- Create: `apps/agent-runtime/agent/skills/export-react.md`
- Create: `apps/agent-runtime/agent/subagents/planner/agent.ts`
- Create: `apps/agent-runtime/agent/subagents/planner/instructions.md`
- Create: `apps/agent-runtime/agent/subagents/generator/agent.ts`
- Create: `apps/agent-runtime/agent/subagents/generator/instructions.md`
- Create: `apps/agent-runtime/agent/subagents/critic/agent.ts`
- Create: `apps/agent-runtime/agent/subagents/critic/instructions.md`
- Create: `apps/agent-runtime/agent/subagents/exporter/agent.ts`
- Create: `apps/agent-runtime/agent/subagents/exporter/instructions.md`
- Create: `apps/agent-runtime/agent/sandbox/sandbox.ts`
- Create: `apps/agent-runtime/evals/generation-smoke.eval.ts`
- Create: `apps/agent-runtime/evals/repair-invalid-spec.eval.ts`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Modify: `apps/api/src/routes/generation-jobs.ts`
- Modify: `packages/shared/src/types.ts`

## Tasks

- [ ] Add `apps/agent-runtime` to the workspace and pin Node 24 for Eve.
- [ ] Install `eve`, `zod`, and provider dependencies needed by the selected model path.
- [ ] Add root scripts:
  - `dev:agent` to run Eve locally;
  - `build:agent` to run `eve build`;
  - `eval:agent` to run Eve evals;
  - `info:agent` to run `eve info --json`.
- [ ] Create `agent/agent.ts` with the default model, compaction threshold, and build externals if shared packages require them.
- [ ] Create root `instructions.md` that defines Open Design Canvas as a DesignSpec-first product and instructs the agent to persist only through approved tools.
- [ ] Create `agent/channels/eve.ts` with local dev auth and production placeholder blocked behind an explicit product auth integration.
- [ ] Create `agent/lib/odc-api-client.ts` as the only route from Eve tools to the product backend.
- [ ] Add typed backend methods:
  - `getProjectContext(projectId)`;
  - `validateDesignSpec(input)`;
  - `compilePreview(input)`;
  - `renderScreenshot(input)`;
  - `createScreenVersion(input)`;
  - `createVariants(input)`;
  - `prepareExport(input)`.
- [ ] Add idempotency helpers for all mutating tool calls using `jobId`, `sessionId`, `turnId`, and `baseVersionId`.
- [ ] Implement `get_project_context` as read-only and redact fields that the model does not need.
- [ ] Implement `validate_design_spec` with exact Zod errors and a compact model-facing summary.
- [ ] Implement `compile_preview` as deterministic compilation through the shared compiler or backend route.
- [ ] Implement `render_screenshot` as an async bridge to the render worker or backend job API.
- [ ] Implement `create_screen_version` as an idempotent mutating tool guarded by validation status.
- [ ] Implement `create_variants` with bounded `variantCount` and explicit variation axes.
- [ ] Implement `prepare_export` as a planning/export-prep tool; actual download artifacts stay in the backend export flow.
- [ ] Add `toModelOutput` for every rich tool result so the model sees summaries, not full artifacts or large HTML.
- [ ] Add approval gates to tools that publish, export externally, overwrite current versions, or touch user-owned integrations.
- [ ] Add Eve skills for DesignSpec authoring, visual critique, and React export.
- [ ] Add declared subagents:
  - `planner` for brief decomposition;
  - `generator` for DesignSpec creation and repair;
  - `critic` for screenshot/log/spec critique;
  - `exporter` for export preparation.
- [ ] Ensure each subagent has its own instructions and duplicates only the tools/skills it needs.
- [ ] Add `odc_knowledge` MCP connection to the knowledge MCP from plan `08`.
- [ ] Configure the Eve sandbox with a restrictive production network policy and seeded examples/schemas only when needed.
- [ ] Update `apps/api/src/routes/generation-jobs.ts` so generation jobs can be dispatched to Eve instead of the legacy direct provider path.
- [ ] Keep the direct provider path behind a feature flag until Eve is stable.
- [ ] Persist Eve `sessionId`, `continuationToken`, and terminal status on generation jobs for observability and resume/debugging.
- [ ] Add backend status mapping from Eve events to existing job statuses: `queued`, `running`, `completed`, `failed`.
- [ ] Add eval `generation-smoke.eval.ts` that asserts a simple dashboard request completes and calls validation before persistence.
- [ ] Add eval `repair-invalid-spec.eval.ts` that asserts invalid DesignSpec output triggers repair/validation before version creation.
- [ ] Document required env vars in `apps/agent-runtime/README.md` or the root env example once the app exists.
- [ ] Run `eve info --json` and fix discovery errors.
- [ ] Run `eve channels list --json` and verify the Eve channel is configured as intended.

## Verification

Run:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm dev:agent
pnpm info:agent
pnpm eval:agent
```

Expected:

- Eve discovers root instructions, tools, skills, subagents, sandbox and the knowledge MCP connection;
- local Eve channel accepts local development requests only;
- generation smoke eval completes;
- invalid DesignSpec eval repairs or fails safely without creating a screen version;
- the product API can create a generation job and observe Eve-driven progress.

## Exit Criteria

A generation job can be routed through Eve, call only approved project tools, validate a DesignSpec, create a `ScreenVersion`, and expose enough session metadata for debugging without moving product ownership out of the backend.
