import { z } from "zod";

const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Expected a hex color like #1f2937");

export const DesignColorTokensSchema = z.object({
  background: HexColorSchema,
  surface: HexColorSchema,
  foreground: HexColorSchema,
  muted: HexColorSchema,
  primary: HexColorSchema,
  primaryForeground: HexColorSchema,
  accent: HexColorSchema,
  border: HexColorSchema,
});

export const DesignTypographyTokensSchema = z.object({
  fontFamily: z.string().min(1).max(160),
  monoFontFamily: z.string().min(1).max(160),
  baseFontSize: z.number().int().min(10).max(24),
  scaleRatio: z.number().min(1.05).max(1.8),
  headingWeight: z.number().int().min(400).max(900),
  bodyWeight: z.number().int().min(300).max(700),
});

export const DesignSpacingTokensSchema = z.object({
  baseUnit: z.number().int().min(2).max(16),
  radius: z.number().int().min(0).max(32),
  borderWidth: z.number().int().min(0).max(4),
});

export const DesignTokensSchema = z.object({
  colors: DesignColorTokensSchema,
  typography: DesignTypographyTokensSchema,
  spacing: DesignSpacingTokensSchema,
});

export const DesignSystemInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  tokens: DesignTokensSchema,
  /** Free-form DESIGN.md guidance injected into generation prompts. */
  designMarkdown: z.string().max(8000).default(""),
});

export const DesignSystemSchema = DesignSystemInputSchema.extend({
  id: z.string().min(1),
});

export type DesignSystemInput = z.infer<typeof DesignSystemInputSchema>;

export type DesignColorTokens = z.infer<typeof DesignColorTokensSchema>;
export type DesignTypographyTokens = z.infer<typeof DesignTypographyTokensSchema>;
export type DesignSpacingTokens = z.infer<typeof DesignSpacingTokensSchema>;
export type DesignTokens = z.infer<typeof DesignTokensSchema>;
export type DesignSystem = z.infer<typeof DesignSystemSchema>;

/**
 * Renders a compact, deterministic prompt context block from a design system so
 * generation jobs produce visually consistent screens within a project.
 */
export function designSystemToPromptContext(system: DesignSystem): string {
  const { colors, typography, spacing } = system.tokens;
  const lines = [
    `Design system: ${system.name}`,
    system.description,
    "Tokens:",
    `- colors: background ${colors.background}, surface ${colors.surface}, foreground ${colors.foreground}, muted ${colors.muted}, primary ${colors.primary} (on ${colors.primaryForeground}), accent ${colors.accent}, border ${colors.border}`,
    `- typography: ${typography.fontFamily} ${typography.baseFontSize}px, scale ${typography.scaleRatio}, headings ${typography.headingWeight}, body ${typography.bodyWeight}`,
    `- spacing: base ${spacing.baseUnit}px, radius ${spacing.radius}px, border ${spacing.borderWidth}px`,
  ];

  const guidance = system.designMarkdown.trim();
  if (guidance.length > 0) {
    lines.push("Guidance:", guidance);
  }

  return lines.join("\n");
}

export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
  id: "default",
  name: "Open Canvas Default",
  description: "A neutral, dense, professional SaaS aesthetic with a calm blue accent.",
  tokens: {
    colors: {
      background: "#f8fafc",
      surface: "#ffffff",
      foreground: "#111827",
      muted: "#6b7280",
      primary: "#2563eb",
      primaryForeground: "#ffffff",
      accent: "#0ea5e9",
      border: "#d8dde6",
    },
    typography: {
      fontFamily: "Inter, system-ui, sans-serif",
      monoFontFamily: "ui-monospace, SFMono-Regular, monospace",
      baseFontSize: 16,
      scaleRatio: 1.25,
      headingWeight: 700,
      bodyWeight: 400,
    },
    spacing: {
      baseUnit: 4,
      radius: 8,
      borderWidth: 1,
    },
  },
  designMarkdown:
    "Favor dense, information-rich layouts. Use generous whitespace between sections but compact rows within tables. Keep one primary accent color; avoid gradients.",
};
