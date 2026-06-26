import { z } from "zod";
import { DeviceTypeSchema } from "./design-spec";

/**
 * Intermediate, traceable record of which UI modules were selected for a
 * generation, and why. Keeps composition decisions auditable without making
 * shadcn/JSX the canonical source — DesignSpec stays the source of truth.
 */
export const ScreenPlanModuleSchema = z.object({
  moduleId: z.string(),
  variantId: z.string(),
  score: z.number(),
  matchedSignals: z.array(z.string()),
});

export const ScreenPlanSchema = z.object({
  prompt: z.string(),
  deviceType: DeviceTypeSchema,
  modules: z.array(ScreenPlanModuleSchema),
});

export type ScreenPlanModule = z.infer<typeof ScreenPlanModuleSchema>;
export type ScreenPlan = z.infer<typeof ScreenPlanSchema>;
