# Versions and Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support editing, version history and variant generation.

**Architecture:** Every edit creates a new ScreenVersion. Variants are generated as child screens or child versions with parentVersionId. The UI exposes history, restore and variant selection.

**Tech Stack:** TypeScript, Zod, BullMQ, React, Playwright.

---

## Files

- Create: `apps/web/src/features/versions/VersionHistory.tsx`
- Create: `apps/web/src/features/variants/VariantPanel.tsx`
- Modify: `apps/api/src/routes/generation-jobs.ts`
- Modify: `apps/api/src/routes/screens.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/worker/src/providers/AiProvider.ts`
- Modify: `apps/web/src/features/chat/ChatPanel.tsx`
- Modify: `packages/shared/src/generation.ts`

## Tasks

- [ ] Add `edit_screen` job type.
- [ ] Add `generate_variants` job type.
- [ ] Implement AI provider methods for edit and variants.
- [ ] Store parentVersionId on edited versions.
- [ ] Add `POST /api/screens/:screenId/current-version`.
- [ ] Add `GET /api/screens/:screenId/versions`.
- [ ] Build `VersionHistory`.
- [ ] Build prompt action "Edit current screen".
- [ ] Build `VariantPanel` with count, aspects and creative range.
- [ ] Add canvas edges with kind `variant`.
- [ ] Add tests for version ordering and restore behavior.
- [ ] Add Playwright test: generate screen, edit it, restore previous version.

## Verification

Run:

```bash
pnpm typecheck
pnpm test
pnpm dev
```

Expected:

- edits create new versions;
- restoring version changes preview;
- variants appear as related screens or nodes.

## Exit Criteria

The product supports real iterative design, not one-shot generation only.

