import { useMemo, useRef, type ComponentType } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { CanvasDocument, CanvasNode } from "@odc/shared";
import {
  canvasDocumentToExcalidrawElements,
  excalidrawElementsToCanvasDocument,
  getSelectedCanvasNodeId,
  type CanvasExcalidrawAppState,
  type CanvasExcalidrawElement,
} from "./canvasMapping";

type CanvasWorkspaceProps = {
  canvas: CanvasDocument | null;
  status: string;
  onCanvasChange: (canvas: CanvasDocument) => void;
  onSelectNode: (node: CanvasNode) => void;
};

type ExcalidrawRendererProps = {
  initialData: {
    elements: readonly CanvasExcalidrawElement[];
    appState: CanvasExcalidrawAppState;
  };
  onChange: (
    elements: readonly CanvasExcalidrawElement[],
    appState: CanvasExcalidrawAppState,
  ) => void;
};

const ExcalidrawRenderer = Excalidraw as unknown as ComponentType<ExcalidrawRendererProps>;

export function CanvasWorkspace({
  canvas,
  status,
  onCanvasChange,
  onSelectNode,
}: CanvasWorkspaceProps) {
  const lastSelectedNodeId = useRef<string | null>(null);
  const elements = useMemo(
    () => {
      if (!canvas) return [];

      const elementSkeletons = canvasDocumentToExcalidrawElements(
        canvas,
      ) as Parameters<typeof convertToExcalidrawElements>[0];

      return convertToExcalidrawElements(elementSkeletons, {
        regenerateIds: false,
      }) as unknown as CanvasExcalidrawElement[];
    },
    [canvas],
  );
  const excalidrawKey = canvas
    ? `${canvas.id}:${canvas.nodes.map((node) => node.id).join(",")}`
    : "empty-canvas";

  function handleChange(
    changedElements: readonly CanvasExcalidrawElement[],
    appState: CanvasExcalidrawAppState,
  ) {
    if (!canvas) return;

    const selectedNodeId = getSelectedCanvasNodeId(changedElements, appState);
    if (selectedNodeId && selectedNodeId !== lastSelectedNodeId.current) {
      lastSelectedNodeId.current = selectedNodeId;
      const selectedNode = canvas.nodes.find((node) => node.id === selectedNodeId);
      if (selectedNode) {
        onSelectNode(selectedNode);
      }
    }

    const nextCanvas = excalidrawElementsToCanvasDocument(canvas, changedElements, appState);
    if (hasCanvasLayoutChanged(canvas, nextCanvas)) {
      onCanvasChange(nextCanvas);
    }
  }

  return (
    <section className="workspace-panel canvas-panel" aria-label="Canvas">
      <div className="panel-header">
        <h2>Canvas</h2>
        <span>{status}</span>
      </div>

      <div className="canvas-workspace">
        {canvas ? (
          <ExcalidrawRenderer
            key={excalidrawKey}
            initialData={{
              elements,
              appState: {
                scrollX: canvas.viewport.x,
                scrollY: canvas.viewport.y,
                zoom: { value: canvas.viewport.zoom },
              },
            }}
            onChange={handleChange}
          />
        ) : (
          <div className="canvas-empty">Loading canvas...</div>
        )}
      </div>
    </section>
  );
}

function hasCanvasLayoutChanged(currentCanvas: CanvasDocument, nextCanvas: CanvasDocument): boolean {
  if (
    currentCanvas.viewport.x !== nextCanvas.viewport.x ||
    currentCanvas.viewport.y !== nextCanvas.viewport.y ||
    currentCanvas.viewport.zoom !== nextCanvas.viewport.zoom
  ) {
    return true;
  }

  return currentCanvas.nodes.some((node, index) => {
    const nextNode = nextCanvas.nodes[index];
    return (
      node.x !== nextNode.x ||
      node.y !== nextNode.y ||
      node.width !== nextNode.width ||
      node.height !== nextNode.height
    );
  });
}
