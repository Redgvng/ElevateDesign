import type { CanvasDocument, CanvasNode, CanvasViewport } from "@odc/shared";

export type CanvasExcalidrawElement = {
  id: string;
  type: "rectangle" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid";
  strokeWidth: number;
  strokeStyle: "solid";
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: null;
  roundness: { type: number };
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  boundElements: null;
  updated: number;
  link: null;
  locked: boolean;
  customData: {
    canvasNodeId: string;
    canvasNodeType: CanvasNode["type"];
    canvasNodeTitle: string;
  };
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left";
  verticalAlign?: "top";
  containerId?: null;
  originalText?: string;
  lineHeight?: number;
};

export type CanvasExcalidrawAppState = {
  scrollX?: number;
  scrollY?: number;
  zoom?: { value?: number };
  selectedElementIds?: Record<string, boolean>;
};

const NODE_RADIUS = { type: 3 };

export function canvasDocumentToExcalidrawElements(
  document: CanvasDocument,
): CanvasExcalidrawElement[] {
  return document.nodes.flatMap((node, index) => [
    {
      ...baseElement(node, index),
      type: "rectangle",
      width: node.width,
      height: node.height,
      strokeColor: node.type === "screen" ? "#2563eb" : "#647084",
      backgroundColor: node.type === "screen" ? "#eff6ff" : "#ffffff",
    },
    {
      ...baseElement(node, index + 1000),
      id: `${node.id}:title`,
      type: "text",
      x: node.x + 16,
      y: node.y + 16,
      width: Math.max(80, node.width - 32),
      height: 48,
      strokeColor: "#17202e",
      backgroundColor: "transparent",
      text: nodeTitle(node),
      originalText: nodeTitle(node),
      fontSize: 18,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
      containerId: null,
      lineHeight: 1.25,
    },
  ]);
}

export function excalidrawElementsToCanvasDocument(
  document: CanvasDocument,
  elements: readonly CanvasExcalidrawElement[],
  appState?: CanvasExcalidrawAppState,
): CanvasDocument {
  const elementByNodeId = new Map(
    elements
      .filter((element) => !element.isDeleted && element.type === "rectangle")
      .map((element) => [element.customData.canvasNodeId, element]),
  );

  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const element = elementByNodeId.get(node.id);
      if (!element) return node;

      return {
        ...node,
        x: element.x,
        y: element.y,
        width: element.width > 0 ? element.width : node.width,
        height: element.height > 0 ? element.height : node.height,
      };
    }),
    viewport: appStateToCanvasViewport(document.viewport, appState),
  };
}

export function getSelectedCanvasNodeId(
  elements: readonly CanvasExcalidrawElement[],
  appState?: CanvasExcalidrawAppState,
): string | null {
  const selectedElementIds = appState?.selectedElementIds;
  if (!selectedElementIds) return null;

  const selectedElement = elements.find((element) => selectedElementIds[element.id]);
  return selectedElement?.customData.canvasNodeId ?? null;
}

export function createScreenCanvasNode(input: {
  screenId: string;
  versionNumber: number;
  title: string;
  screenshotArtifactId?: string | null;
  index: number;
}): CanvasNode {
  const column = input.index % 3;
  const row = Math.floor(input.index / 3);

  return {
    id: `node_${input.screenId}`,
    type: "screen",
    refId: input.screenId,
    pinnedVersionId: null,
    x: 80 + column * 300,
    y: 80 + row * 260,
    width: 260,
    height: 190,
    title: input.title,
    body: `Version ${input.versionNumber}`,
    screenshotArtifactId: input.screenshotArtifactId ?? null,
  };
}

function appStateToCanvasViewport(
  currentViewport: CanvasViewport,
  appState?: CanvasExcalidrawAppState,
): CanvasViewport {
  return {
    x: typeof appState?.scrollX === "number" ? appState.scrollX : currentViewport.x,
    y: typeof appState?.scrollY === "number" ? appState.scrollY : currentViewport.y,
    zoom:
      typeof appState?.zoom?.value === "number" && appState.zoom.value > 0
        ? appState.zoom.value
        : currentViewport.zoom,
  };
}

function baseElement(node: CanvasNode, index: number): CanvasExcalidrawElement {
  return {
    id: node.id,
    type: "rectangle",
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    angle: 0,
    strokeColor: "#2563eb",
    backgroundColor: "#eff6ff",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: NODE_RADIUS,
    seed: 1000 + index,
    version: 1,
    versionNonce: 2000 + index,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    customData: {
      canvasNodeId: node.id,
      canvasNodeType: node.type,
      canvasNodeTitle: node.title,
    },
  };
}

function nodeTitle(node: CanvasNode): string {
  const subtitle = node.body ?? node.type;
  return `${node.title}\n${subtitle}`;
}
