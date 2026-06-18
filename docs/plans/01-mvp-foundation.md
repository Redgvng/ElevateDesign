# MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the base application shell with projects, persistence, and the workspace layout.

**Architecture:** A Vite React frontend talks to a Node API. The API stores projects and canvas documents in Postgres through Drizzle. The workspace shows chat, canvas and preview panels, but generation is mocked in this phase.

**Tech Stack:** React, TypeScript, Vite, Tailwind, shadcn/ui, Node, Fastify or Hono, Drizzle, PostgreSQL, Vitest.

---

## Files

- Create: `package.json`
- Create: `apps/web/package.json`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/features/workspace/Workspace.tsx`
- Create: `apps/web/src/features/projects/ProjectsPage.tsx`
- Create: `apps/api/package.json`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/routes/projects.ts`
- Create: `packages/db/src/schema.ts`
- Create: `packages/shared/src/types.ts`

## Tasks

- [ ] Create a pnpm workspace with `apps/web`, `apps/api`, `packages/db`, `packages/shared`.
- [ ] Add root scripts: `dev`, `test`, `typecheck`, `lint`.
- [ ] Scaffold Vite React TypeScript app in `apps/web`.
- [ ] Add Tailwind and shadcn/ui base configuration.
- [ ] Create API server with health route `GET /health`.
- [ ] Define shared `Project` and `CanvasDocument` types.
- [ ] Define Drizzle schema for `projects` and `canvas_documents`.
- [ ] Add project routes:
  - `POST /api/projects`
  - `GET /api/projects`
  - `GET /api/projects/:projectId`
- [ ] Build `ProjectsPage` with create project form and project list.
- [ ] Build `Workspace` layout with left chat panel, center temporary canvas panel, right temporary preview panel.
- [ ] Add unit tests for project route validation.
- [ ] Add a Playwright smoke test that creates a project and opens the workspace.

## Verification

Run:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm dev
```

Expected:

- web app starts;
- API starts;
- `GET /health` returns ok;
- a project can be created and opened.

## Exit Criteria

The user can create a project and land in an empty workspace with three visible panels: chat, canvas, preview.
