import { describe, expect, it } from "vitest";
import { CreateGenerationJobInputSchema } from "./generation";

describe("CreateGenerationJobInputSchema", () => {
  it("accepts a generate screen job", () => {
    const result = CreateGenerationJobInputSchema.safeParse({
      type: "generate_screen",
      prompt: "Create a dense SaaS monitoring dashboard",
      deviceType: "desktop",
      mode: "quality",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty prompts", () => {
    const result = CreateGenerationJobInputSchema.safeParse({
      type: "generate_screen",
      prompt: "",
      deviceType: "desktop",
      mode: "quality",
    });

    expect(result.success).toBe(false);
  });
});
