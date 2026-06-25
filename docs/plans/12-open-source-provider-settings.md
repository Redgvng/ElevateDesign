# Open Source Provider Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** let a self-hosted open source user configure `mock`, OpenAI, or Anthropic from the UI without editing environment files, while keeping `DesignSpec` as the source of truth and keeping provider secrets out of generated outputs.

**Architecture:** Provider configuration becomes an instance/workspace-level backend setting, exposed through a Settings UI. API keys are accepted only through dedicated settings routes, stored encrypted server-side, never returned to the frontend, and resolved by the worker when executing a generation job. Each job snapshots non-secret provider metadata (`provider`, `model`) for auditability; generated HTML/React/screenshots remain artifacts derived from validated `DesignSpec`.

**Tech Stack:** TypeScript, Hono, Zod, Drizzle/Postgres, Node crypto, React/Vite, existing worker/provider pipeline, official OpenAI and Anthropic SDKs.

---

## Decision Summary

The previous audit and brainstorming converged on two constraints:

- The app currently cannot honestly claim provider settings are functional: there is no settings UI, no settings API, no real OpenAI/Anthropic adapter path, and the worker always constructs `MockAiProvider`.
- For an open source product, a Settings page is required. Users should not need to edit `.env` manually just to enter an API key.

The decision for the next tranche is:

- Add a Settings surface for AI provider configuration.
- Allow API key entry in the UI.
- Treat the key as write-only: the frontend can submit or replace it, but can never read it back.
- Store provider keys encrypted server-side.
- Use environment variables as bootstrap/fallback only, not as the only configuration path.
- Keep this scoped as self-hosted instance/workspace configuration, not a full multi-user BYOK platform.
- Defer billing, quotas, multi-user auth UI, secret sharing policies, and workspace admin roles until auth is implemented.

## Non-Negotiable Invariants

- `DesignSpec` remains the source of truth for generated UI.
- HTML, React, screenshots, logs, and exports remain artifacts.
- The frontend must never receive stored API keys, partial API keys, provider raw responses, or decrypted secret material.
- Provider keys must not appear in prompts, jobs, `DesignSpec`, generated HTML, screenshots, artifacts, logs, exports, Eve context, or MCP context.
- Generated HTML/code remains untrusted and sandboxed.
- The backend remains owner of projects, jobs, screens, versions, artifacts, auth boundaries, persistence, and settings.
- `mock` remains the default provider for tests and local deterministic development.

## Current Gaps

- `apps/web/src/features/workspace/Workspace.tsx` renders only Chat, Canvas, and Preview; there is no Settings surface.
- `apps/api/src/server.ts` mounts project, canvas, generation job, screen, artifact, and health routes; no settings routes exist.
- `apps/worker/src/index.ts` always constructs `new MockAiProvider()`.
- `apps/worker/src/providers/` has no `createAiProvider.ts`, `OpenAiProvider.ts`, or `AnthropicProvider.ts`.
- `apps/worker/package.json` does not include `openai` or `@anthropic-ai/sdk`.
- `packages/shared/src/generation.ts` does not expose provider/model metadata on job/version contracts.
- `packages/db/src/schema.ts` already has provider/model columns on `screen_versions` and `generation_jobs`, but jobs do not reliably set them and serializers omit them.

## Files

### Create

- `packages/shared/src/provider-settings.ts`
- `packages/db/src/provider-settings-store.ts`
- `packages/db/src/secret-encryption.ts`
- `apps/api/src/lib/provider-settings-store.ts`
- `apps/api/src/routes/provider-settings.ts`
- `apps/worker/src/providers/createAiProvider.ts`
- `apps/worker/src/providers/OpenAiProvider.ts`
- `apps/worker/src/providers/AnthropicProvider.ts`
- `apps/worker/src/providers/providerOutput.ts`
- `apps/web/src/features/settings/ProviderSettingsPanel.tsx`
- `apps/web/src/features/settings/ProviderSettingsPanel.test.tsx`
- `packages/db/migrations/0003_provider_settings.sql`

### Modify

- `packages/shared/src/index.ts`
- `packages/shared/src/generation.ts`
- `packages/db/src/index.ts`
- `packages/db/src/schema.ts`
- `packages/db/src/pg-generation-repositories.ts`
- `packages/db/src/generation-store.ts`
- `apps/api/src/config.ts`
- `apps/api/src/server.ts`
- `apps/api/package.json`
- `apps/api/src/routes/generation-jobs.ts`
- `apps/worker/package.json`
- `apps/worker/src/config.ts`
- `apps/worker/src/index.ts`
- `apps/worker/src/jobs/generationJobProcessor.ts`
- `apps/worker/src/providers/AiProvider.ts`
- `apps/worker/src/providers/MockAiProvider.ts`
- `apps/web/src/features/workspace/Workspace.tsx`
- `apps/web/src/features/chat/ChatPanel.tsx`
- `apps/web/src/styles.css`
- `.env.example`
- `docs/10-api-contracts.md`
- `docs/15-ai-providers.md`

## Target API Contracts

### Read Provider Settings

```http
GET /api/settings/ai-provider
```

Response:

```json
{
  "settings": {
    "activeProvider": "mock",
    "providers": {
      "mock": {
        "enabled": true,
        "model": "mock-v1",
        "keyStatus": "not_required",
        "source": "default"
      },
      "openai": {
        "enabled": false,
        "model": "gpt-4.1-mini",
        "keyStatus": "missing",
        "source": "settings",
        "lastValidatedAt": null,
        "lastErrorCode": null
      },
      "anthropic": {
        "enabled": false,
        "model": "claude-3-5-sonnet-latest",
        "keyStatus": "missing",
        "source": "settings",
        "lastValidatedAt": null,
        "lastErrorCode": null
      }
    }
  }
}
```

### Update Non-Secret Provider Settings

```http
PUT /api/settings/ai-provider
Content-Type: application/json
```

Request:

```json
{
  "activeProvider": "openai",
  "openai": {
    "enabled": true,
    "model": "gpt-4.1-mini"
  },
  "anthropic": {
    "enabled": false,
    "model": "claude-3-5-sonnet-latest"
  }
}
```

Response returns the same safe shape as `GET /api/settings/ai-provider`.

### Set Or Replace Provider Key

```http
PUT /api/settings/ai-provider/:provider/key
Content-Type: application/json
```

Allowed `:provider`: `openai`, `anthropic`.

Request:

```json
{
  "apiKey": "provider-secret-value"
}
```

Response:

```json
{
  "provider": "openai",
  "keyStatus": "set"
}
```

### Delete Provider Key

```http
DELETE /api/settings/ai-provider/:provider/key
```

Response:

```json
{
  "provider": "openai",
  "keyStatus": "missing"
}
```

### Test Provider

```http
POST /api/settings/ai-provider/:provider/test
```

Response:

```json
{
  "provider": "openai",
  "ok": true,
  "lastValidatedAt": "2026-06-25T10:00:00.000Z"
}
```

Errors must use existing API style:

```json
{
  "error": {
    "code": "PROVIDER_AUTH_FAILED",
    "message": "Provider rejected the configured API key"
  }
}
```

## Data Model

Add two focused tables. Do not use a generic JSON settings table.

```text
ai_provider_settings
- workspace_id text primary key references workspaces(id) on delete cascade
- active_provider text not null default 'mock'
- openai_enabled boolean not null default false
- openai_model text
- anthropic_enabled boolean not null default false
- anthropic_model text
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

ai_provider_secrets
- workspace_id text not null references workspaces(id) on delete cascade
- provider text not null
- encrypted_api_key text not null
- key_fingerprint text not null
- encryption_version integer not null default 1
- last_validated_at timestamptz
- last_error_code text
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
- primary key (workspace_id, provider)
```

Allowed providers for `ai_provider_secrets.provider`: `openai`, `anthropic`.

## Encryption Model

Use authenticated encryption with a server-side key.

Environment:

```bash
SECRET_ENCRYPTION_KEY=base64-encoded-32-byte-key
```

Rules:

- Production requires `SECRET_ENCRYPTION_KEY`.
- Development may use `SECRET_ENCRYPTION_KEY` when present.
- If development lacks `SECRET_ENCRYPTION_KEY`, generate a local key file at `.odc/local-secret-key`.
- `.odc/` must be gitignored.
- The local key file is for self-host developer convenience only.
- If the local key is deleted, stored provider keys cannot be decrypted and should be treated as missing/unreadable.

Use AES-256-GCM or another authenticated encryption primitive available in Node's `crypto` module.

## Tasks

### Task 1: Shared Provider Settings Contracts

**Files:**

- Create: `packages/shared/src/provider-settings.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] Add `AiProviderNameSchema`.
- [ ] Add `ProviderKeyStatusSchema`.
- [ ] Add safe response schemas for settings reads.
- [ ] Add update schemas for non-secret settings.
- [ ] Add key write schema with `apiKey` min length.
- [ ] Export all new schemas and types from `packages/shared/src/index.ts`.

Expected type names:

```ts
AiProviderName
AiProviderSettings
AiProviderSettingsResponse
UpdateAiProviderSettingsInput
SetProviderKeyInput
ProviderConnectionTestResult
```

### Task 2: Secret Encryption Utility

**Files:**

- Create: `packages/db/src/secret-encryption.ts`
- Modify: `packages/db/src/index.ts`
- Modify: `.gitignore` if `.odc/` is not already ignored

- [ ] Implement `loadOrCreateLocalSecretKey`.
- [ ] Implement `createSecretEncryption`.
- [ ] Implement `encryptSecret(plaintext: string): string`.
- [ ] Implement `decryptSecret(ciphertext: string): string`.
- [ ] Implement `fingerprintSecret(provider: string, plaintext: string): string`.
- [ ] Ensure decrypted values never appear in thrown error messages.

Implementation requirements:

- Ciphertext format must include version, iv, auth tag, and encrypted payload.
- Production must fail if `SECRET_ENCRYPTION_KEY` is missing.
- Development may create `.odc/local-secret-key`.

### Task 3: Provider Settings Schema And Migration

**Files:**

- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/migrations/0003_provider_settings.sql`

- [ ] Add `aiProviderSettings` Drizzle table.
- [ ] Add `aiProviderSecrets` Drizzle table.
- [ ] Add indexes needed for workspace lookup.
- [ ] Add SQL migration matching the Drizzle schema.
- [ ] Keep provider secrets separate from non-secret settings.

Migration must create only provider settings tables and indexes. It must not rewrite existing `screens`, `screen_versions`, `generation_jobs`, or `artifacts` data.

### Task 4: Provider Settings Repository

**Files:**

- Create: `packages/db/src/provider-settings-store.ts`
- Modify: `packages/db/src/index.ts`

- [ ] Add repository interface for reading safe settings.
- [ ] Add repository method for updating non-secret settings.
- [ ] Add repository method for upserting encrypted key.
- [ ] Add repository method for deleting key.
- [ ] Add repository method for resolving decrypted provider config for worker use.
- [ ] Add repository method for recording provider test status.

Repository must return safe settings without decrypted keys by default.

### Task 5: API Configuration For Secret Encryption

**Files:**

- Modify: `apps/api/src/config.ts`
- Modify: `.env.example`

- [ ] Add `SECRET_ENCRYPTION_KEY` support.
- [ ] Add `ALLOW_LOCAL_SECRET_KEY_FILE=true|false` or equivalent development behavior.
- [ ] Keep existing env provider variables as bootstrap/defaults.
- [ ] Document that UI-entered settings override env bootstrap values for the default workspace.
- [ ] Production must fail if secret storage can be used but encryption key is missing.

### Task 6: Settings API Routes

**Files:**

- Create: `apps/api/src/lib/provider-settings-store.ts`
- Create: `apps/api/src/routes/provider-settings.ts`
- Modify: `apps/api/src/server.ts`

- [ ] Mount settings routes under `/api/settings/ai-provider`.
- [ ] Implement `GET /api/settings/ai-provider`.
- [ ] Implement `PUT /api/settings/ai-provider`.
- [ ] Implement `PUT /api/settings/ai-provider/:provider/key`.
- [ ] Implement `DELETE /api/settings/ai-provider/:provider/key`.
- [ ] Implement `POST /api/settings/ai-provider/:provider/test`.
- [ ] Use Zod validation for every request body.
- [ ] Reject `mock` key writes with `VALIDATION_ERROR`.
- [ ] Return only safe settings shapes.
- [ ] Redact request bodies and provider errors before returning any error.

Until auth lands, routes should operate on `config.defaultWorkspace.id`.

### Task 7: Provider Runtime Contract

**Files:**

- Modify: `apps/worker/src/providers/AiProvider.ts`
- Modify: `apps/worker/src/providers/MockAiProvider.ts`
- Create: `apps/worker/src/providers/providerOutput.ts`
- Modify: `packages/shared/src/generation.ts`

- [ ] Extend `GenerateDesignOutput` with `provider` and `model`.
- [ ] Add optional server-only `raw` field, but do not expose it through API schemas.
- [ ] Add provider/model fields to shared `GenerationJobSchema` and `ScreenVersionSchema` only if they are safe and useful in UI.
- [ ] Update `MockAiProvider` to return `provider: "mock"` and `model: "mock-v1"`.
- [ ] Define provider error mapping codes:
  - `PROVIDER_ERROR`
  - `PROVIDER_AUTH_FAILED`
  - `PROVIDER_TIMEOUT`
  - `PROVIDER_RATE_LIMIT`
  - `INVALID_PROVIDER_OUTPUT`

### Task 8: Worker Provider Factory

**Files:**

- Create: `apps/worker/src/providers/createAiProvider.ts`
- Create: `apps/worker/src/providers/OpenAiProvider.ts`
- Create: `apps/worker/src/providers/AnthropicProvider.ts`
- Modify: `apps/worker/package.json`
- Modify: `apps/worker/src/index.ts`
- Modify: `apps/worker/src/config.ts`

- [ ] Add pinned `openai` dependency.
- [ ] Add pinned `@anthropic-ai/sdk` dependency.
- [ ] Add `createAiProvider(resolvedConfig)` factory.
- [ ] Implement OpenAI adapter with strict JSON output parsing.
- [ ] Implement Anthropic adapter with strict JSON extraction.
- [ ] Keep mock deterministic.
- [ ] Worker must not always instantiate `MockAiProvider`.
- [ ] Worker must resolve provider settings from backend/DB before processing the job.
- [ ] If active provider key is missing or unreadable, fail the job with `AI_PROVIDER_NOT_CONFIGURED`.

### Task 9: Generation Job Provider Snapshot

**Files:**

- Modify: `packages/db/src/generation-store.ts`
- Modify: `packages/db/src/pg-generation-repositories.ts`
- Modify: `apps/api/src/routes/generation-jobs.ts`
- Modify: `apps/worker/src/jobs/generationJobProcessor.ts`

- [ ] On job creation, snapshot non-secret `provider` and `model` onto `generation_jobs`.
- [ ] On job execution, validate the snapshotted provider/model against current settings.
- [ ] Persist `provider` and `model` onto `screen_versions`.
- [ ] Serialize provider/model in safe API responses.
- [ ] Persist provider errors as typed job errors.
- [ ] Do not persist raw provider responses.

### Task 10: Settings UI

**Files:**

- Create: `apps/web/src/features/settings/ProviderSettingsPanel.tsx`
- Modify: `apps/web/src/features/workspace/Workspace.tsx`
- Modify: `apps/web/src/features/chat/ChatPanel.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] Add a workspace topbar tab or segmented control with `Build` and `Settings`.
- [ ] `Build` keeps the existing Chat, Canvas, Preview grid.
- [ ] `Settings` renders `ProviderSettingsPanel`.
- [ ] Add provider select for `Mock`, `OpenAI`, and `Anthropic`.
- [ ] Add model field for OpenAI and Anthropic.
- [ ] Add write-only API key field for OpenAI and Anthropic.
- [ ] Show `Configured`, `Missing key`, `Invalid`, `Untested`, or `Ready`.
- [ ] Add `Save` action.
- [ ] Add `Test connection` action.
- [ ] Clear API key input after save, provider switch, and unmount.
- [ ] Never place API key in localStorage, sessionStorage, URL, job payload, or React parent state outside the settings component.
- [ ] Add a read-only provider badge to Chat or job status.

### Task 11: Redaction And Error Handling

**Files:**

- Modify: `apps/api/src/routes/provider-settings.ts`
- Modify: `apps/worker/src/jobs/generationJobProcessor.ts`
- Modify: `apps/worker/src/providers/OpenAiProvider.ts`
- Modify: `apps/worker/src/providers/AnthropicProvider.ts`

- [ ] Add helper that redacts known provider key patterns from error messages.
- [ ] Normalize provider SDK errors into safe internal codes.
- [ ] Ensure API never returns provider raw errors with request bodies.
- [ ] Ensure worker job errors do not include decrypted keys or raw provider payloads.
- [ ] Ensure connection test failures return actionable but safe messages.

### Task 12: Documentation Updates

**Files:**

- Modify: `docs/10-api-contracts.md`
- Modify: `docs/15-ai-providers.md`
- Modify: `docs/plans/10-durable-product-foundation.md`
- Modify: `.env.example`

- [ ] Document settings API routes.
- [ ] Document the open source self-hosted configuration model.
- [ ] Document `SECRET_ENCRYPTION_KEY`.
- [ ] Document `.odc/local-secret-key` development behavior.
- [ ] Clarify that UI-entered keys are encrypted server-side and never returned.
- [ ] Clarify that env provider settings remain supported as bootstrap/defaults.
- [ ] Clarify that full multi-user BYOK and admin permissions are deferred until auth.

## Verification Plan

Respect low machine load when working locally.

### Static Checks

- [ ] Inspect route mounts with `rg "provider-settings|ai-provider" apps/api/src`.
- [ ] Inspect that no code returns `encryptedApiKey` or decrypted key to frontend.
- [ ] Inspect that `MockAiProvider` is no longer hardcoded in worker runtime.
- [ ] Inspect that `provider` and `model` are serialized without secret fields.

### Targeted Unit Tests

Run only specific tests while developing:

```bash
pnpm --filter @odc/shared test -- provider-settings
pnpm --filter @odc/db test -- provider-settings
pnpm --filter @odc/api test -- provider-settings
pnpm --filter @odc/worker test -- providers
pnpm --filter @odc/web test -- ProviderSettingsPanel
```

Expected:

- provider settings schemas accept safe payloads and reject invalid providers;
- encryption round-trips and fails safely with wrong keys;
- settings routes never return API keys;
- provider factory selects mock/openai/anthropic correctly;
- UI clears key input after save.

### Later Full Verification

Run only when machine load is acceptable or on CI:

```bash
pnpm typecheck
pnpm test:unit
pnpm build
```

Optional live provider checks must require explicit env/setup and must not run by default.

## Exit Criteria

- A self-hosted user can open Settings and configure `mock`, OpenAI, or Anthropic without editing `.env`.
- API keys entered in Settings are encrypted server-side and never returned to the browser.
- Worker uses the configured provider instead of always using `MockAiProvider`.
- Every generation job records non-secret provider/model metadata.
- `ScreenVersion` records non-secret provider/model metadata.
- Invalid or missing provider configuration produces typed, actionable errors.
- Mock remains deterministic and usable without API keys.
- Raw provider responses are not persisted or exposed by default.
- Docs explain local development, production encryption key requirements, and deferred multi-user BYOK/auth work.

## Deferred Work

- Multi-user auth UI.
- Workspace owner/admin permission model for settings.
- Billing, quotas, and per-user provider accounting.
- External secret manager integration.
- Key rotation audit log UI.
- Per-job provider override.
- Automatic repair loop for invalid model output.
- Visual critic and multimodal provider calls.
- Eve orchestration.
