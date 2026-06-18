# MCP Knowledge Builder Playbook

Use when building `packages/mcp-knowledge`.

## Scope

Owns:

- MCP server;
- docs catalog;
- search/read tools;
- playbook resources;
- DesignSpec schema resource;
- HTTP/SSE and optional stdio transports;
- redaction and path allow-listing.

## Rules

- Default MCP is read-only.
- Return bounded excerpts, not full repo dumps.
- Reject path traversal.
- Redact secret-shaped strings.
- Do not expose user/project data unless a separate authenticated product tool is designed.
- Keep transport compatible with Eve MCP connections.

## Verification

Required tests:

- `list_docs` returns catalog;
- `search_docs` finds known docs;
- `read_doc` rejects outside paths;
- redaction catches tokens/private keys/env-like strings;
- smoke call works over the selected transport.

