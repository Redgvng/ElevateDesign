import { z } from "zod";
import { DesignSpecSchema, DeviceTypeSchema } from "./design-spec";

export const GenerationModeSchema = z.enum(["fast", "quality"]);
export const GenerationJobTypeSchema = z.enum([
  "generate_screen",
  "edit_screen",
  "generate_variants",
]);
export const GenerationJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const CreateGenerationJobInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("generate_screen"),
    prompt: z.string().trim().min(1, "Prompt is required").max(4000),
    deviceType: DeviceTypeSchema,
    mode: GenerationModeSchema.default("fast"),
  }),
  z.object({
    type: z.literal("edit_screen"),
    screenId: z.string().trim().min(1, "screenId is required"),
    prompt: z.string().trim().min(1, "Prompt is required").max(4000),
    deviceType: DeviceTypeSchema,
    mode: GenerationModeSchema.default("fast"),
  }),
  z.object({
    type: z.literal("generate_variants"),
    screenId: z.string().trim().min(1, "screenId is required"),
    prompt: z.string().trim().min(1, "Prompt is required").max(4000),
    deviceType: DeviceTypeSchema,
    mode: GenerationModeSchema.default("fast"),
    count: z.number().int().min(2).max(4).default(3),
  }),
]);

export const GenerationJobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: GenerationJobTypeSchema,
  status: GenerationJobStatusSchema,
  prompt: z.string(),
  deviceType: DeviceTypeSchema,
  mode: GenerationModeSchema,
  targetScreenId: z.string().nullish(),
  variantCount: z.number().int().nullish(),
  designContext: z.string().nullish(),
  result: z
    .object({
      screenId: z.string(),
      screenVersionId: z.string(),
    })
    .nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ScreenSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  deviceType: DeviceTypeSchema,
  currentVersionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ScreenVersionSchema = z.object({
  id: z.string(),
  screenId: z.string(),
  versionNumber: z.number().int().positive(),
  sourcePrompt: z.string(),
  operation: z.enum(["generate", "edit", "variant", "import"]),
  designSpec: DesignSpecSchema,
  htmlCode: z.string(),
  reactCode: z.string().nullable(),
  screenshotArtifactId: z.string().nullable(),
  parentVersionId: z.string().nullable(),
  createdAt: z.string(),
});

export const ScreenVersionSummarySchema = ScreenVersionSchema.pick({
  id: true,
  screenId: true,
  versionNumber: true,
  operation: true,
  screenshotArtifactId: true,
  parentVersionId: true,
  createdAt: true,
});

export const ArtifactSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  screenVersionId: z.string().nullable(),
  type: z.enum(["screenshot", "html", "reactZip", "image", "log", "figmaPayload"]),
  storageKey: z.string(),
  checksum: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export const ArtifactDescriptorSchema = z.object({
  artifact: ArtifactSchema,
  contentUrl: z.string().min(1),
});

export type CreateGenerationJobInput = z.infer<typeof CreateGenerationJobInputSchema>;
export type GenerationJob = z.infer<typeof GenerationJobSchema>;
export type GenerationJobStatus = z.infer<typeof GenerationJobStatusSchema>;
export type GenerationJobType = z.infer<typeof GenerationJobTypeSchema>;
export type GenerationMode = z.infer<typeof GenerationModeSchema>;
export type Screen = z.infer<typeof ScreenSchema>;
export type ScreenVersion = z.infer<typeof ScreenVersionSchema>;
export type ScreenVersionSummary = z.infer<typeof ScreenVersionSummarySchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ArtifactDescriptor = z.infer<typeof ArtifactDescriptorSchema>;
