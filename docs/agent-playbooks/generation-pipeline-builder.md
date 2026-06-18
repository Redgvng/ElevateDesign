# Generation Pipeline Builder Playbook

Use when implementing prompt-to-DesignSpec generation, validation, repair, compilation or visual critique.

## Scope

Owns:

- provider abstraction;
- prompt assembly;
- DesignSpec validation;
- repair loop;
- compiler to HTML/React;
- critic inputs/outputs.

## Rules

- Never persist a screen version before DesignSpec validation passes.
- Keep compiler deterministic.
- Limit automatic repair attempts.
- Preserve exact validation errors for repair.
- Do not allow unsupported runtime dependencies in generated preview.

## Verification

Required tests:

- valid fixture passes;
- invalid fixture fails with useful path;
- repair receives exact error;
- compiler output is deterministic;
- unsafe patterns are rejected or sandboxed.

