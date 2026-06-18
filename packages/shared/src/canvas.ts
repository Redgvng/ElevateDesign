import { z } from "zod";

export const CanvasNodeTypeSchema = z.enum([
  "screen",
  "prompt",
  "image",
  "code",
  "note",
  "designSystem",
]);

export const CanvasNodeSchema = z.object({
  id: z.string().min(1),
  type: CanvasNodeTypeSchema,
  refId: z.string().nullable(),
  pinnedVersionId: z.string().nullable().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  title: z.string().min(1).max(160),
  body: z.string().nullable(),
  screenshotArtifactId: z.string().nullable().optional(),
});

export const CanvasEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  label: z.string().nullable(),
  kind: z.enum(["prototype", "reference", "variant", "handoff"]),
});

export const CanvasViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});

export const CanvasDocumentSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  schemaVersion: z.literal("1.0"),
  nodes: z.array(CanvasNodeSchema),
  edges: z.array(CanvasEdgeSchema),
  viewport: CanvasViewportSchema,
  updatedAt: z.string(),
});

export const UpdateCanvasDocumentInputSchema = z.object({
  nodes: z.array(CanvasNodeSchema),
  edges: z.array(CanvasEdgeSchema),
  viewport: CanvasViewportSchema,
});

export type CanvasNodeType = z.infer<typeof CanvasNodeTypeSchema>;
export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;
export type CanvasViewport = z.infer<typeof CanvasViewportSchema>;
export type CanvasDocument = z.infer<typeof CanvasDocumentSchema>;
export type UpdateCanvasDocumentInput = z.infer<typeof UpdateCanvasDocumentInputSchema>;
