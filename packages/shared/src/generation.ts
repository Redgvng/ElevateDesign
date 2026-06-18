import { z } from "zod";
import { DesignSpecSchema, DeviceTypeSchema } from "./design-spec";

export const GenerationModeSchema = z.enum(["fast", "quality"]);
export const GenerationJobStatusSchema = z.enum(["queued", "running", "completed", "failed"]);

export const CreateGenerationJobInputSchema = z.object({
  type: z.literal("generate_screen"),
  prompt: z.string().trim().min(1, "Prompt is required").max(4000),
  deviceType: DeviceTypeSchema,
  mode: GenerationModeSchema.default("fast"),
});

export const GenerationJobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: z.literal("generate_screen"),
  status: GenerationJobStatusSchema,
  prompt: z.string(),
  deviceType: DeviceTypeSchema,
  mode: GenerationModeSchema,
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

export type CreateGenerationJobInput = z.infer<typeof CreateGenerationJobInputSchema>;
export type GenerationJob = z.infer<typeof GenerationJobSchema>;
export type GenerationJobStatus = z.infer<typeof GenerationJobStatusSchema>;
export type GenerationMode = z.infer<typeof GenerationModeSchema>;
export type Screen = z.infer<typeof ScreenSchema>;
export type ScreenVersion = z.infer<typeof ScreenVersionSchema>;
