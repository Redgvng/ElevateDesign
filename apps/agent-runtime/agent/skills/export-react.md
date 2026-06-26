# React export

How to prepare a React/Tailwind export for a screen version.

## Rules

- Exports are **reproducible outputs** of the `DesignSpec`, never the source.
- Use `prepare_export` to produce the export plan (formats + filenames). The
  actual downloadable artifacts (standalone HTML, `.tsx`, runnable Vite zip with
  README) are produced by the product backend/web export flow.
- Prefer the `vite-zip` format when the user wants something they can run:
  `npm install && npm run dev`.

## Workflow

1. Identify the target screen version.
2. Call `prepare_export` with the desired formats.
3. Surface the plan (filenames) to the user; treat external publishing as an
   action requiring explicit approval.
