import type { DesignNode, DesignSpec } from "./design-spec";

/**
 * Deterministic, dependency-free compilation of a DesignSpec into a standalone
 * HTML document. Lives in @odc/shared so the API, worker, and Eve agent runtime
 * all compile previews the same way — DesignSpec stays the single source.
 */
export function designSpecToHtml(designSpec: DesignSpec): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(designSpec.title)}</title>
    <style>
      :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #111827; background: #f8fafc; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #f8fafc; }
      .odc-root { width: 100%; min-height: 100vh; padding: 32px; display: grid; gap: 24px; }
      .odc-title { margin: 0; font-size: 36px; line-height: 1.1; letter-spacing: 0; }
      .odc-stack { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
      .odc-card, .odc-table { border: 1px solid #d8dde6; border-radius: 8px; background: #fff; box-shadow: 0 10px 24px rgb(15 23 42 / 6%); }
      .odc-card { min-height: 148px; padding: 20px; display: grid; align-content: end; font-weight: 720; }
      .odc-table { min-height: 420px; padding: 22px; color: #475569; }
      @media (max-width: 760px) { .odc-stack { grid-template-columns: 1fr; } .odc-root { padding: 20px; } }
    </style>
  </head>
  <body>
    ${renderNode(designSpec.root)}
  </body>
</html>`;
}

function renderNode(node: DesignNode): string {
  if (node.type === "frame") return `<main class="odc-root">${node.children.map(renderNode).join("")}</main>`;
  if (node.type === "stack") return `<section class="odc-stack">${node.children.map(renderNode).join("")}</section>`;
  if (node.type === "text") return `<h1 class="odc-title">${escapeHtml(node.content.text ?? node.name)}</h1>`;
  if (node.type === "card") return `<article class="odc-card">${escapeHtml(node.content.text ?? node.name)}</article>`;
  if (node.type === "table") return `<section class="odc-table">${escapeHtml(node.content.text ?? node.name)}</section>`;
  return `<div>${escapeHtml(node.content.text ?? node.name)}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
