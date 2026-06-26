import type { DesignNode, DesignSpec } from "@odc/shared";

export type FigmaPlanSize = number | "fill" | "hug";

export type FigmaPlanNode = {
  kind: DesignNode["type"];
  name: string;
  text?: string;
  width: FigmaPlanSize;
  height: FigmaPlanSize;
  direction: "row" | "column";
  gap: number;
  children: FigmaPlanNode[];
};

export type FigmaImportPlan = {
  title: string;
  width: number;
  height: number;
  root: FigmaPlanNode;
};

function planNode(node: DesignNode): FigmaPlanNode {
  const layout = node.layout as {
    width?: FigmaPlanSize;
    height?: FigmaPlanSize;
    direction?: "row" | "column";
    gap?: number;
  };
  return {
    kind: node.type,
    name: node.name,
    text: node.content.text,
    width: layout.width ?? "hug",
    height: layout.height ?? "hug",
    direction: layout.direction ?? "column",
    gap: layout.gap ?? 0,
    children: node.children.map(planNode),
  };
}

/**
 * Converts a DesignSpec into a Figma-friendly import plan. Pure and
 * deterministic so the plugin's node-creation code can be unit-tested without
 * the Figma runtime. DesignSpec stays the source of truth.
 */
export function designSpecToFigmaPlan(spec: DesignSpec): FigmaImportPlan {
  return {
    title: spec.title,
    width: spec.viewport.width,
    height: spec.viewport.height,
    root: planNode(spec.root),
  };
}
