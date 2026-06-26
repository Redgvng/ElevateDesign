# DesignSpec authoring

How to author a valid, high-quality `DesignSpec` for Open Design Canvas.

## Rules

- The `DesignSpec` is the **single source of truth**. Author structure, not HTML
  or JSX. Exports are compiled from the spec.
- Always set `schemaVersion: "1.0"`, a clear `title`, the requested `deviceType`,
  and a sensible `viewport`.
- Build the tree from `frame` → `stack`/`text`/`card`/`table` nodes. Keep depth
  shallow and names human-readable.
- When a project has a design system, honor its tokens (colors, typography,
  spacing) — request project context first.

## Workflow

1. Decompose the brief; pick modules that fit (the backend traces `moduleRefs`).
2. Author the spec.
3. Call `validate_design_spec`. Fix **every** issue before continuing.
4. Optionally `compile_preview` to confirm it compiles.
5. Persist with `create_screen_version`.
