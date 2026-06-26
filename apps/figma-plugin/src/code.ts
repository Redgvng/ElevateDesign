import type { FigmaImportPlan, FigmaPlanNode } from "./figma-plan";

type ImportMessage = {
  type: "import-screen";
  plan: FigmaImportPlan;
  screenshot?: Uint8Array;
};

figma.showUI(__html__, { width: 360, height: 280 });

figma.ui.onmessage = async (message: ImportMessage) => {
  if (message.type !== "import-screen") return;

  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const root = createFrame(message.plan.root, message.plan.width, message.plan.height);
  root.name = message.plan.title;

  if (message.screenshot && message.screenshot.length > 0) {
    const image = figma.createImage(message.screenshot);
    root.fills = [
      { type: "IMAGE", scaleMode: "FILL", imageHash: image.hash },
    ];
  }

  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([root]);
  figma.notify(`Imported "${message.plan.title}" from Open Design Canvas`);
};

function resolveSize(size: FigmaPlanNode["width"], fallback: number): number {
  return typeof size === "number" ? size : fallback;
}

function createFrame(node: FigmaPlanNode, fallbackW: number, fallbackH: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = node.name;
  frame.resize(resolveSize(node.width, fallbackW), resolveSize(node.height, fallbackH));
  frame.layoutMode = node.direction === "row" ? "HORIZONTAL" : "VERTICAL";
  frame.itemSpacing = node.gap;

  if (node.text) {
    const text = figma.createText();
    text.characters = node.text;
    text.fontName = node.kind === "text" ? { family: "Inter", style: "Bold" } : { family: "Inter", style: "Regular" };
    frame.appendChild(text);
  }

  for (const child of node.children) {
    frame.appendChild(createFrame(child, resolveSize(node.width, fallbackW), 120));
  }
  return frame;
}
