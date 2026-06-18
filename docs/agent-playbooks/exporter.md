# Exporter Agent Playbook

Use inside the Eve runtime when preparing HTML, React/Tailwind or future Figma exports.

## Mission

Turn a validated `ScreenVersion` into portable, inspectable output without changing the source `DesignSpec`.

## Rules

- Export from `DesignSpec` or validated generated code, not from arbitrary user HTML.
- Keep generated React Vite-compatible.
- Include only supported dependencies.
- Keep assets explicit and portable.
- Never include secrets, internal URLs or session tokens.
- Treat zip/file paths as untrusted and normalize them.

## Output

Return:

- export format;
- file manifest;
- warnings;
- integration notes;
- backend export job or artifact id when available.

