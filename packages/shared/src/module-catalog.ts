import { z } from "zod";
import { DeviceTypeSchema } from "./design-spec";

export const ModuleFamilySchema = z.enum([
  "app-shell",
  "navigation",
  "dashboard",
  "data-display",
  "form",
  "auth",
  "marketing",
  "pricing",
  "settings",
  "feedback",
]);

export const ModuleDensitySchema = z.enum(["compact", "comfortable", "spacious"]);

const StableIdentifierSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "Expected a stable kebab-case identifier");

export const ModuleSlotSchema = z.object({
  id: StableIdentifierSchema,
  required: z.boolean(),
  accepts: z.array(StableIdentifierSchema).min(1).max(12),
  minItems: z.number().int().positive().max(24).optional(),
  maxItems: z.number().int().positive().max(48).optional(),
});

export const ModuleVariantSchema = z.object({
  id: StableIdentifierSchema,
  label: z.string().min(1).max(80),
  density: ModuleDensitySchema,
  composition: z.string().min(1).max(500),
  bestFor: z.array(z.string().min(1).max(120)).min(1).max(12),
  promptSignals: z.array(z.string().min(1).max(80)).min(2).max(16),
  variationAxes: z.object({
    hierarchy: z.string().min(1).max(80),
    navigation: z.string().min(1).max(80),
    contentVolume: z.string().min(1).max(80),
    visualTone: z.string().min(1).max(120),
  }),
});

export const ModuleSelectionHeuristicsSchema = z.object({
  positivePromptSignals: z.array(z.string().min(1).max(80)).min(1).max(24),
  negativePromptSignals: z.array(z.string().min(1).max(80)).max(24),
  compatibleFamilies: z.array(ModuleFamilySchema).max(12),
  incompatibleFamilies: z.array(ModuleFamilySchema).max(12),
});

export const ModuleDefinitionSchema = z
  .object({
    id: z
      .string()
      .regex(
        /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
        "Module id must use stable family.slug format",
      ),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "Module version must be semver-like"),
    family: ModuleFamilySchema,
    name: z.string().min(1).max(120),
    description: z.string().min(1).max(500),
    intentTags: z.array(StableIdentifierSchema).min(1).max(24),
    useWhen: z.array(z.string().min(1).max(240)).min(1).max(12),
    avoidWhen: z.array(z.string().min(1).max(240)).max(12),
    deviceSupport: z.array(DeviceTypeSchema).min(1).max(4),
    slots: z.array(ModuleSlotSchema).max(12),
    variants: z.array(ModuleVariantSchema).min(1).max(12),
    selectionHeuristics: ModuleSelectionHeuristicsSchema,
    designSpecHints: z.object({
      allowedNodeTypes: z.array(StableIdentifierSchema).min(1).max(24),
      maxDepth: z.number().int().min(1).max(20),
      responsiveBehavior: z.array(z.string().min(1).max(240)).max(12),
    }),
    shadcnHints: z.object({
      primitives: z.array(z.string().min(1).max(80)).max(24),
      registryItems: z.array(StableIdentifierSchema).min(1).max(24),
      compositionNotes: z.array(z.string().min(1).max(240)).max(12),
    }),
    accessibilityNotes: z.array(z.string().min(1).max(240)).max(12),
  })
  .superRefine((definition, context) => {
    const variantIds = new Set<string>();
    definition.variants.forEach((variant, index) => {
      if (variantIds.has(variant.id)) {
        context.addIssue({
          code: "custom",
          path: ["variants", index, "id"],
          message: "Module variant ids must be unique",
        });
      }
      variantIds.add(variant.id);
    });
  });

export type ModuleFamily = z.infer<typeof ModuleFamilySchema>;
export type ModuleDensity = z.infer<typeof ModuleDensitySchema>;
export type ModuleSlot = z.infer<typeof ModuleSlotSchema>;
export type ModuleVariant = z.infer<typeof ModuleVariantSchema>;
export type ModuleSelectionHeuristics = z.infer<typeof ModuleSelectionHeuristicsSchema>;
export type ModuleDefinition = z.infer<typeof ModuleDefinitionSchema>;
