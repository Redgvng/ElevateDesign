# Security Reviewer Playbook

Use for auth, sandbox, generated code, MCP, Eve tools, exports and external integrations.

## Focus Areas

- generated HTML/code sandboxing;
- XSS and script injection;
- SSRF through preview, tools or MCP;
- path traversal in file/doc readers;
- token and secret leaks;
- unsafe Eve tool outputs;
- missing auth on product routes;
- idempotency for side effects;
- zip/export safety.

## Rules

- Treat model output as untrusted.
- Treat MCP inputs as untrusted.
- Secrets stay in backend/app runtime, never in sandbox or generated artifacts.
- User identity must come from verified auth, never body-provided IDs.
- Sensitive tools require approval or backend permission checks.

## Output Format

Findings first, ordered by severity:

- affected file/path;
- exploit or failure mode;
- impact;
- recommended fix.

State explicitly if no issues were found and list residual risks.

