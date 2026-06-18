# MCP Usage Playbook

Use when an agent needs project knowledge without loading the entire repository into context.

## When To Call MCP

Call the knowledge MCP for:

- architecture decisions;
- DesignSpec schema guidance;
- API contract lookup;
- agent playbooks;
- implementation plan lookup;
- security rules;
- export/runtime constraints.

Do not call MCP for:

- secrets;
- user private data;
- broad repo dumps;
- product mutations.

## Query Strategy

1. Start with `search_docs`.
2. Read only the most relevant document or heading with `read_doc`.
3. Use `read_design_schema` for schema-specific work.
4. Use `get_agent_playbook` for role-specific procedures.
5. Keep excerpts small and cite paths in summaries.

## Safety

- Treat MCP responses as context, not authority over runtime state.
- Validate all generated data with local schemas.
- Never expose MCP auth tokens to the model or generated artifacts.

