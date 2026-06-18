# Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export a ScreenVersion as standalone HTML and React/Tailwind project.

**Architecture:** Export jobs read ScreenVersion and produce Artifact records. HTML export is direct. React export builds a small Vite-compatible file tree and zips it.

**Tech Stack:** JSZip or archiver, TypeScript, API routes, object storage, Playwright verification.

---

## Files

- Create: `apps/api/src/routes/exports.ts`
- Create: `apps/worker/src/exports/exportHtml.ts`
- Create: `apps/worker/src/exports/exportReact.ts`
- Create: `apps/worker/src/exports/createZip.ts`
- Create: `apps/web/src/features/exports/ExportMenu.tsx`
- Modify: `apps/worker/src/index.ts`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/db/src/schema.ts`

## Tasks

- [ ] Add `export_jobs` table or reuse `generation_jobs` with export type.
- [ ] Add `POST /api/exports`.
- [ ] Add `GET /api/exports/:exportId`.
- [ ] Implement HTML export from ScreenVersion.htmlCode.
- [ ] Implement React export from ScreenVersion.reactCode or compile DesignSpec to React.
- [ ] Add generated `package.json`, `src/App.tsx`, `src/main.tsx`, `src/index.css`, `README.md`.
- [ ] Zip React export.
- [ ] Store export as Artifact.
- [ ] Build `ExportMenu` with HTML and React options.
- [ ] Add tests that exported HTML contains expected title and body.
- [ ] Add test that React export zip contains required files.
- [ ] Add Playwright check that exported HTML opens and renders.

## Verification

Run:

```bash
pnpm typecheck
pnpm test
pnpm dev
```

Expected:

- HTML export downloads and opens;
- React export zip contains a runnable Vite app;
- failed exports return `EXPORT_ERROR` with useful details.

## Exit Criteria

The user can take an generated screen out of Open Design Canvas and use it elsewhere.

