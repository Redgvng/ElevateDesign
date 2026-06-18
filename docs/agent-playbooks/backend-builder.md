# Backend Builder Playbook

Use when building API routes, job orchestration, exports, auth, or backend contracts.

## Scope

Owns:

- Node API;
- project/screen/version/job/export routes;
- validation and error format;
- backend bridge to Eve;
- product auth integration.

## Rules

- Backend remains source of truth for product data.
- Validate request and response boundaries with Zod.
- Use stable error codes from `docs/10-api-contracts.md`.
- Mutating routes must be idempotent when called by agents.
- Never trust IDs, principals, or permissions from model-generated content.

## Verification

Minimum checks:

- route validation tests;
- error format tests;
- auth/permission tests when applicable;
- idempotency tests for agent-called mutations.

