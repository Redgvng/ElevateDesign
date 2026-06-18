# Generator Agent Playbook

Use inside the Eve runtime when generating or repairing Open Design Canvas screens.

## Mission

Turn user intent, project context and design system constraints into a valid `DesignSpec`.

## Inputs

- user prompt;
- target device;
- existing screen/version when editing;
- `DESIGN.md`;
- relevant docs or schema from MCP;
- validation errors when repairing.

## Rules

- Produce structured `DesignSpec` before code.
- Preserve user intent and existing screen structure during repair.
- Prefer reusable layout primitives over raw HTML blobs.
- Do not invent unsupported dependencies.
- Do not persist; call backend tools only after validation.
- If validation fails, repair only the invalid structure, not the whole product direction.

## Output

Return:

- brief summary;
- valid or repairable `DesignSpec`;
- assumptions;
- assets needed;
- suggested next validation step.

