# Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display generated screens as movable nodes on an infinite canvas.

**Architecture:** The app stores a CanvasDocument per project. Generated screens create canvas nodes. Excalidraw renders the canvas for MVP while the stored CanvasDocument remains independent from Excalidraw internals.

**Tech Stack:** Excalidraw, React, TypeScript, API persistence, Playwright screenshots.

---

## Files

- Create: `apps/web/src/features/canvas/CanvasWorkspace.tsx`
- Create: `apps/web/src/features/canvas/canvasMapping.ts`
- Create: `apps/api/src/routes/canvas.ts`
- Create: `apps/worker/src/render/renderHtmlScreenshot.ts`
- Modify: `apps/web/src/features/workspace/Workspace.tsx`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/db/src/schema.ts`

## Tasks

- [x] Add CanvasDocument and CanvasNode shared types.
- [x] Add API routes:
  - `GET /api/projects/:projectId/canvas`
  - `PUT /api/projects/:projectId/canvas`
- [x] Integrate Excalidraw in `CanvasWorkspace`.
- [x] Convert CanvasNode to Excalidraw elements.
- [x] Convert Excalidraw movement updates back to CanvasDocument.
- [x] Add screenshot artifact creation after generation.
- [ ] Display screenshot image inside screen nodes.
- [x] On generation completion, add a `screen` node to the canvas.
- [x] Click a screen node to open its version in preview.
- [x] Add tests for CanvasDocument persistence.
- [x] Add Playwright test: generate screen, verify node appears, drag node, reload, verify position persists.

## Implementation Notes

- Excalidraw is the MVP renderer, but `CanvasDocument` remains the product-owned source of truth.
- Movement persistence is stored through `PUT /api/projects/:projectId/canvas`.
- Generation creates a screenshot artifact id on `ScreenVersion`; durable artifact storage and image hydration into Excalidraw nodes are still pending.
- The current web build includes Excalidraw in the main bundle and emits large chunk warnings. Code-splitting `CanvasWorkspace` is recommended before broadening the app surface.

## Verification

Run:

```bash
pnpm typecheck
pnpm test
pnpm dev
```

Expected:

- generated screen creates a canvas node;
- node can be moved;
- position persists after reload.

## Exit Criteria

The canvas becomes the main organization surface for generated screens.
