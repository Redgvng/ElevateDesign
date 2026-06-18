# Generation and Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a prompt into a validated DesignSpec and render it in preview.

**Architecture:** The API creates generation jobs. A worker calls an AI provider abstraction, validates output with Zod, compiles DesignSpec to HTML and stores a ScreenVersion. The frontend polls job status and renders the result.

**Tech Stack:** Zod, BullMQ, Redis, Playwright, Sandpack, iframe sandbox, TypeScript.

---

## Files

- Create: `packages/shared/src/design-spec.ts`
- Create: `packages/shared/src/generation.ts`
- Create: `apps/api/src/routes/generation-jobs.ts`
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/src/providers/AiProvider.ts`
- Create: `apps/worker/src/providers/MockAiProvider.ts`
- Create: `apps/worker/src/providers/OpenAiProvider.ts`
- Create: `apps/worker/src/providers/AnthropicProvider.ts`
- Create: `apps/worker/src/providers/createAiProvider.ts`
- Create: `apps/worker/src/compiler/designSpecToHtml.ts`
- Create: `apps/web/src/features/chat/ChatPanel.tsx`
- Create: `apps/web/src/features/preview/PreviewPanel.tsx`
- Modify: `packages/db/src/schema.ts`
- Reference: `docs/15-ai-providers.md`

## Tasks

- [ ] Add database tables for `screens`, `screen_versions`, `generation_jobs`, `artifacts`.
- [ ] Define `DesignSpecSchema` with Zod.
- [ ] Implement `MockAiProvider` that returns a deterministic dashboard DesignSpec.
- [ ] Implement OpenAI provider adapter using the official `openai` SDK.
- [ ] Implement Anthropic provider adapter using the official `@anthropic-ai/sdk`.
- [ ] Implement provider selection via `AI_PROVIDER=mock|openai|anthropic`.
- [ ] Implement `designSpecToHtml`.
- [ ] Add `POST /api/projects/:projectId/generation-jobs`.
- [ ] Add `GET /api/generation-jobs/:jobId`.
- [ ] Add worker that processes `generate_screen` jobs.
- [ ] Store generated screen and screen version.
- [ ] Build `ChatPanel` prompt input.
- [ ] Build `PreviewPanel` with iframe sandbox for generated HTML.
- [ ] Show job states: queued, running, completed, failed.
- [ ] Add tests for invalid DesignSpec rejection.
- [ ] Add provider fixture tests for OpenAI-shaped and Anthropic-shaped structured outputs.
- [ ] Add Playwright test: submit prompt, wait for preview, assert iframe renders content.

## Verification

Run:

```bash
pnpm typecheck
pnpm test
pnpm dev
```

Expected:

- prompt submission creates a job;
- worker completes job;
- preview displays generated HTML;
- invalid DesignSpec fails with `VALIDATION_ERROR`.

## Exit Criteria

A user can type a prompt and see a generated screen in the preview panel.
