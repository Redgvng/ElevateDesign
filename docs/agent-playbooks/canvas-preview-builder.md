# Canvas Preview Builder Playbook

Use when building canvas, preview, screenshots, responsive preview or sandboxed rendering.

## Scope

Owns:

- Excalidraw/canvas integration;
- screen nodes;
- iframe/Sandpack preview;
- screenshot display;
- preview errors and console bridge.

## Rules

- Treat all generated UI as untrusted.
- Keep preview isolated from the host app.
- Store optimized screenshots for canvas nodes.
- Keep canvas state separate from screen version data.
- Avoid making canvas the source of truth for UI structure.

## Verification

Check:

- generated screen renders in preview;
- node appears on canvas;
- pan/zoom/select works;
- runtime errors are visible;
- sandbox restrictions remain in place.

