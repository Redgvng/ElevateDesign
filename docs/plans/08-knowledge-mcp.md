# Knowledge MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal MCP server that exposes Open Design Canvas docs, schemas, decisions, examples, and agent playbooks to Eve agents and development agents.

**Architecture:** The MCP server is a separate workspace package/app with read-only documentation tools by default. It indexes `docs/`, schema packages, ADRs, plans, and curated playbooks, returning bounded excerpts instead of dumping whole files. Sensitive project data is kept out of the default knowledge MCP and added later through authenticated product tools if needed.

**Tech Stack:** TypeScript, Node 24, MCP SDK, Streamable HTTP or SSE transport for Eve, optional stdio transport for local development, Zod, existing Markdown docs.

---

## Context

Read before implementation:

- [Eve integration reference](../13-eve-agent-framework.md)
- [Eve agent runtime plan](07-agent-runtime-eve.md)
- [Architecture](../02-architecture.md)
- [Design system](../07-design-system.md)
- [API contracts](../10-api-contracts.md)
- [Security](../09-security.md)

## Files

- Create: `packages/mcp-knowledge/package.json`
- Create: `packages/mcp-knowledge/src/index.ts`
- Create: `packages/mcp-knowledge/src/server.ts`
- Create: `packages/mcp-knowledge/src/transports/http.ts`
- Create: `packages/mcp-knowledge/src/transports/stdio.ts`
- Create: `packages/mcp-knowledge/src/docs/catalog.ts`
- Create: `packages/mcp-knowledge/src/docs/readDoc.ts`
- Create: `packages/mcp-knowledge/src/docs/searchDocs.ts`
- Create: `packages/mcp-knowledge/src/schemas/readDesignSchema.ts`
- Create: `packages/mcp-knowledge/src/playbooks/catalog.ts`
- Create: `packages/mcp-knowledge/src/playbooks/readPlaybook.ts`
- Create: `packages/mcp-knowledge/src/security/auth.ts`
- Create: `packages/mcp-knowledge/src/security/redaction.ts`
- Create: `packages/mcp-knowledge/src/tools.ts`
- Create: `packages/mcp-knowledge/test/searchDocs.test.ts`
- Create: `packages/mcp-knowledge/test/readDoc.test.ts`
- Create: `packages/mcp-knowledge/test/redaction.test.ts`
- Create: `docs/agent-playbooks/generator.md`
- Create: `docs/agent-playbooks/critic.md`
- Create: `docs/agent-playbooks/exporter.md`
- Create: `docs/agent-playbooks/mcp-usage.md`
- Modify: `AGENTS.md`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Modify: `docs/00-index.md`
- Modify: `README.md`

## MCP Surface

Tools to expose:

| Tool | Purpose |
| --- | --- |
| `list_docs` | Return known docs with title, path, category, and summary |
| `search_docs` | Search docs by query and optional category |
| `read_doc` | Read a bounded section or full small document by path |
| `read_design_schema` | Return the latest or requested DesignSpec schema |
| `list_agent_playbooks` | Return available agent playbooks |
| `get_agent_playbook` | Read a bounded playbook by id |
| `search_examples` | Search curated DesignSpec/export examples when they exist |

Resources to expose:

```text
docs://index
docs://architecture
docs://ai-pipeline
docs://eve-agent-framework
schema://design-spec/latest
playbook://generator
playbook://critic
playbook://exporter
```

## Tasks

- [ ] Add `packages/mcp-knowledge` to the workspace.
- [ ] Install the MCP SDK, Zod, and test dependencies used by the repo.
- [ ] Add root scripts:
  - `dev:mcp-knowledge`;
  - `test:mcp-knowledge`;
  - `build:mcp-knowledge`.
- [ ] Implement a docs catalog that maps known Markdown files to title, category, tags, and summary.
- [ ] Include all current docs:
  - `docs/00-index.md`;
  - `docs/01-product-spec.md`;
  - `docs/02-architecture.md`;
  - `docs/03-tech-stack.md`;
  - `docs/04-data-model.md`;
  - `docs/05-ai-pipeline.md`;
  - `docs/06-canvas-and-preview.md`;
  - `docs/07-design-system.md`;
  - `docs/08-exports.md`;
  - `docs/09-security.md`;
  - `docs/10-api-contracts.md`;
  - `docs/11-roadmap.md`;
  - `docs/12-estimates-with-agents.md`;
  - `docs/13-eve-agent-framework.md`;
  - `docs/14-subagent-operating-model.md`;
  - `AGENTS.md`;
  - `docs/agent-playbooks/*.md`;
  - ADRs and implementation plans.
- [ ] Implement `list_docs` with optional category filtering.
- [ ] Implement `search_docs` with deterministic text search first; add embeddings later only if text search is insufficient.
- [ ] Implement `read_doc` with path allow-listing, heading-section selection, and maximum character limits.
- [ ] Implement `read_design_schema` backed by the shared DesignSpec package once it exists; until then, read the documented schema from `docs/05-ai-pipeline.md`.
- [ ] Create `docs/agent-playbooks/generator.md` with generation-specific rules.
- [ ] Create `docs/agent-playbooks/critic.md` with visual critique rules.
- [ ] Create `docs/agent-playbooks/exporter.md` with export rules.
- [ ] Create `docs/agent-playbooks/mcp-usage.md` with instructions for when agents should call the MCP.
- [ ] Implement `list_agent_playbooks` and `get_agent_playbook`.
- [ ] Implement `search_examples` over curated examples once examples exist; return an empty result with a clear message before examples are added.
- [ ] Implement HTTP transport compatible with Eve MCP connections: Streamable HTTP or SSE.
- [ ] Implement optional stdio transport for local Codex/dev workflows.
- [ ] Add token auth for HTTP transport using `MCP_KNOWLEDGE_TOKEN`.
- [ ] Keep stdio transport local-only and unauthenticated.
- [ ] Add redaction for env-like strings, bearer tokens, private keys, and accidental secrets.
- [ ] Add request limits:
  - maximum query length;
  - maximum returned documents;
  - maximum returned characters per tool call.
- [ ] Add tests for catalog coverage.
- [ ] Add tests for `search_docs` matching known docs.
- [ ] Add tests for `read_doc` rejecting paths outside the docs allow-list.
- [ ] Add tests for redaction.
- [ ] Add a smoke test that starts the MCP server and calls `list_docs`.
- [ ] Wire `apps/agent-runtime/agent/connections/odc_knowledge.ts` to this MCP in plan `07`.
- [ ] Document local usage commands in package README when the package exists.

## Verification

Run:

```bash
pnpm install
pnpm typecheck
pnpm test:mcp-knowledge
pnpm build:mcp-knowledge
pnpm dev:mcp-knowledge
```

Expected:

- `list_docs` returns the current documentation catalog;
- `search_docs` finds architecture, AI pipeline, Eve integration and security documents;
- `read_doc` reads allowed docs and rejects path traversal;
- redaction removes secret-shaped strings;
- Eve can discover the MCP connection and call `connection__odc_knowledge__search_docs`.

## Exit Criteria

Agents can retrieve the project documentation, DesignSpec guidance, API contracts, and playbooks through MCP without loading the entire repository into context and without exposing secrets or product data by default.
