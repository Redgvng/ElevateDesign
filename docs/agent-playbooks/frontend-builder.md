# Frontend Builder Playbook

Use when building or reviewing the React/Vite frontend.

## Scope

Owns:

- Project Shell;
- Chat Panel;
- Canvas Workspace;
- Preview Panel;
- Design System Panel;
- export UI.

Does not own:

- backend persistence;
- DesignSpec schema semantics;
- agent orchestration;
- MCP server behavior.

## Rules

- Use existing stack: React, TypeScript, Vite, Tailwind, shadcn/ui, Radix UI, Lucide.
- Keep UI dense, useful and work-focused.
- Do not build marketing pages for app surfaces.
- Use icons for tool buttons where possible.
- Keep generated preview isolated in iframe/Sandpack.
- Add Playwright coverage for critical flows.

## Verification

Run the plan-specific commands, then verify:

- no incoherent overlapping UI;
- mobile and desktop layouts fit;
- prompt -> job -> preview state is visible;
- errors are actionable.

