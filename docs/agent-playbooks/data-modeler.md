# Data Modeler Playbook

Use when changing database schema, shared types, migrations, or persistence contracts.

## Scope

Owns:

- Drizzle schema;
- migrations;
- shared domain types;
- persistence constraints;
- indexes for project, screen, version, job and artifact lookups.

## Rules

- `DesignSpec` is source of truth for generated screens.
- HTML, React and screenshots are artifacts.
- Preserve parent-child relationships for versions and variants.
- Add idempotency keys for agent-driven writes.
- Keep generated content auditable.

## Verification

Check:

- schema supports rollback/version history;
- jobs can map to Eve session metadata later;
- indexes match list/detail access patterns;
- migrations are reversible or have explicit forward-only rationale.

