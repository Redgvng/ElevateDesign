import type { DesignNode, DesignSpec } from "@odc/shared";

const NODE_CLASSES: Record<string, string> = {
  frame: "grid min-h-screen w-full gap-6 bg-slate-50 p-8 text-slate-900",
  stack: "grid grid-cols-1 gap-4 md:grid-cols-3",
  text: "m-0 text-4xl font-bold leading-tight",
  card: "grid min-h-[148px] content-end rounded-lg border border-slate-200 bg-white p-5 font-semibold shadow-sm",
  table: "min-h-[420px] rounded-lg border border-slate-200 bg-white p-6 text-slate-600",
};

const NODE_TAGS: Record<string, string> = {
  frame: "main",
  stack: "section",
  text: "h1",
  card: "article",
  table: "section",
};

/**
 * Compiles a DesignSpec into a standalone React + Tailwind component module.
 * Deterministic: the same spec always yields the same source.
 */
export function designSpecToReact(designSpec: DesignSpec): string {
  const body = renderNode(designSpec.root, 3);
  return `export default function GeneratedScreen() {
  return (
${body}
  );
}
`;
}

function renderNode(node: DesignNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const tag = NODE_TAGS[node.type] ?? "div";
  const className = NODE_CLASSES[node.type] ?? "";
  const classAttr = className ? ` className="${className}"` : "";

  if (node.type === "frame" || node.type === "stack") {
    const children = node.children.map((child) => renderNode(child, depth + 1)).join("\n");
    return `${indent}<${tag}${classAttr}>\n${children}\n${indent}</${tag}>`;
  }

  const text = node.content.text ?? node.name;
  return `${indent}<${tag}${classAttr}>{${JSON.stringify(text)}}</${tag}>`;
}

export function reactDownloadName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "screen"}.tsx`;
}
