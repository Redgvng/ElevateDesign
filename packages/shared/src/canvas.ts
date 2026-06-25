import { z } from "zod";

export const CanvasNodeTypeSchema = z.enum([
  "screen",
  "prompt",
  "image",
  "code",
  "note",
  "designSystem",
]);

export const CanvasNodeSchema = z
  .object({
    id: z.string().min(1),
    type: CanvasNodeTypeSchema,
    refId: z.string().nullable(),
    pinnedVersionId: z.string().nullable().optional(),
    x: z.number().finite().min(-1_000_000).max(1_000_000),
    y: z.number().finite().min(-1_000_000).max(1_000_000),
    width: z.number().finite().positive().max(100_000),
    height: z.number().finite().positive().max(100_000),
    title: z.string().min(1).max(160),
    body: z.string().max(20_000).nullable(),
    screenshotArtifactId: z.string().nullable().optional(),
  })
  .superRefine((node, context) => {
    if (node.type === "screen" && !node.refId) {
      context.addIssue({
        code: "custom",
        path: ["refId"],
        message: "Screen canvas nodes must reference a screen",
      });
    }
    if (node.type !== "screen" && node.pinnedVersionId) {
      context.addIssue({
        code: "custom",
        path: ["pinnedVersionId"],
        message: "Only screen canvas nodes may pin a screen version",
      });
    }
  });

export const CanvasEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  label: z.string().nullable(),
  kind: z.enum(["prototype", "reference", "variant", "handoff"]),
});

export const CanvasViewportSchema = z.object({
  x: z.number().finite().min(-1_000_000).max(1_000_000),
  y: z.number().finite().min(-1_000_000).max(1_000_000),
  zoom: z.number().finite().min(0.05).max(8),
});

export const CanvasDocumentSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    schemaVersion: z.literal("1.0"),
    revision: z.number().int().positive(),
    nodes: z.array(CanvasNodeSchema).max(1_000),
    edges: z.array(CanvasEdgeSchema).max(5_000),
    viewport: CanvasViewportSchema,
    updatedAt: z.string(),
  })
  .superRefine(validateCanvasGraph);

export const UpdateCanvasDocumentInputSchema = z
  .object({
    revision: z.number().int().positive(),
    nodes: z.array(CanvasNodeSchema).max(1_000),
    edges: z.array(CanvasEdgeSchema).max(5_000),
    viewport: CanvasViewportSchema,
  })
  .superRefine(validateCanvasGraph);

function validateCanvasGraph(
  canvas: {
    nodes: Array<{ id: string }>;
    edges: Array<{ id: string; sourceNodeId: string; targetNodeId: string }>;
  },
  context: z.RefinementCtx,
): void {
  const nodeIds = new Set<string>();
  canvas.nodes.forEach((node, index) => {
    if (nodeIds.has(node.id)) {
      context.addIssue({
        code: "custom",
        path: ["nodes", index, "id"],
        message: `Duplicate canvas node id: ${node.id}`,
      });
    }
    nodeIds.add(node.id);
  });

  const edgeIds = new Set<string>();
  canvas.edges.forEach((edge, index) => {
    if (edgeIds.has(edge.id)) {
      context.addIssue({
        code: "custom",
        path: ["edges", index, "id"],
        message: `Duplicate canvas edge id: ${edge.id}`,
      });
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.sourceNodeId)) {
      context.addIssue({
        code: "custom",
        path: ["edges", index, "sourceNodeId"],
        message: `Canvas edge source does not exist: ${edge.sourceNodeId}`,
      });
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      context.addIssue({
        code: "custom",
        path: ["edges", index, "targetNodeId"],
        message: `Canvas edge target does not exist: ${edge.targetNodeId}`,
      });
    }
    if (edge.sourceNodeId === edge.targetNodeId) {
      context.addIssue({
        code: "custom",
        path: ["edges", index],
        message: "Canvas edges cannot connect a node to itself",
      });
    }
  });
}

export type CanvasNodeType = z.infer<typeof CanvasNodeTypeSchema>;
export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;
export type CanvasViewport = z.infer<typeof CanvasViewportSchema>;
export type CanvasDocument = z.infer<typeof CanvasDocumentSchema>;
export type UpdateCanvasDocumentInput = z.infer<typeof UpdateCanvasDocumentInputSchema>;
