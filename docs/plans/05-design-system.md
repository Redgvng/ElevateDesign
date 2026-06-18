# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add DESIGN.md and design tokens to guide generation consistently.

**Architecture:** Each project owns a default DesignSystem. The backend stores raw DESIGN.md and parsed tokens. Generation jobs include design context in provider input.

**Tech Stack:** Markdown parser, Zod, React, TypeScript.

---

## Files

- Create: `packages/shared/src/design-system.ts`
- Create: `apps/api/src/routes/design-system.ts`
- Create: `apps/worker/src/design-system/parseDesignMd.ts`
- Create: `apps/web/src/features/design-system/DesignSystemPanel.tsx`
- Modify: `apps/worker/src/providers/AiProvider.ts`
- Modify: `apps/worker/src/index.ts`
- Modify: `packages/db/src/schema.ts`

## Tasks

- [ ] Add `design_systems` table.
- [ ] Create default DESIGN.md when a project is created.
- [ ] Implement `parseDesignMd`.
- [ ] Add route `GET /api/projects/:projectId/design-system`.
- [ ] Add route `PUT /api/projects/:projectId/design-system`.
- [ ] Build `DesignSystemPanel` with Markdown editor.
- [ ] Show parsed token preview.
- [ ] Include DESIGN.md and tokens in generation job context.
- [ ] Store designSystemId on ScreenVersion.
- [ ] Add tests for parsing colors, typography and avoid rules.
- [ ] Add Playwright test: update primary color, generate screen, verify output references the color.

## Verification

Run:

```bash
pnpm typecheck
pnpm test
pnpm dev
```

Expected:

- every project has DESIGN.md;
- generation receives design context;
- style rules influence generated output.

## Exit Criteria

Screens generated in one project follow a reusable design system.

