# Eve Agent Runtime Builder Playbook

Use when building `apps/agent-runtime` with Eve.

## Scope

Owns:

- Eve app structure;
- `agent.ts`;
- instructions;
- tools;
- skills;
- declared subagents;
- Eve evals;
- Eve channel config.

## Rules

- Eve orchestrates; backend persists.
- Tools must be typed, idempotent and narrow.
- Use `toModelOutput` for large or sensitive tool results.
- Gate sensitive tools with approval.
- Keep product credentials in app runtime only.
- Connect to the knowledge MCP through `defineMcpClientConnection`.

## Verification

Run:

```bash
pnpm info:agent
pnpm eval:agent
```

Expected:

- Eve discovers all intended slots;
- channel auth is explicit;
- evals cover generation and invalid spec repair;
- no tool leaks secrets or full artifacts to the model.

