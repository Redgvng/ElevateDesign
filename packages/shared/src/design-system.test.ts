import { describe, expect, it } from "vitest";
import {
  DEFAULT_DESIGN_SYSTEM,
  DesignSystemSchema,
  designSystemToPromptContext,
} from "./design-system";

describe("design system", () => {
  it("validates the default design system against its schema", () => {
    expect(() => DesignSystemSchema.parse(DEFAULT_DESIGN_SYSTEM)).not.toThrow();
  });

  it("rejects malformed color tokens", () => {
    const broken = {
      ...DEFAULT_DESIGN_SYSTEM,
      tokens: {
        ...DEFAULT_DESIGN_SYSTEM.tokens,
        colors: { ...DEFAULT_DESIGN_SYSTEM.tokens.colors, primary: "blue" },
      },
    };
    expect(DesignSystemSchema.safeParse(broken).success).toBe(false);
  });

  it("renders a deterministic prompt context that includes tokens and guidance", () => {
    const context = designSystemToPromptContext(DEFAULT_DESIGN_SYSTEM);

    expect(context).toContain("Open Canvas Default");
    expect(context).toContain("primary #2563eb");
    expect(context).toContain("Inter, system-ui, sans-serif");
    expect(context).toContain("Guidance:");
    expect(designSystemToPromptContext(DEFAULT_DESIGN_SYSTEM)).toBe(context);
  });

  it("omits the guidance block when designMarkdown is empty", () => {
    const context = designSystemToPromptContext({
      ...DEFAULT_DESIGN_SYSTEM,
      designMarkdown: "   ",
    });
    expect(context).not.toContain("Guidance:");
  });
});
