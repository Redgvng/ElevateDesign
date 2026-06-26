import { z } from "zod";
import { defineTool } from "eve/tools";
import { clientFromEnv } from "../lib/client-from-env";
import { createVariants, type CreateVariantsResult } from "../lib/create-variants";

/**
 * Eve tool wrapper: requests N parallel variants of an existing screen through
 * the backend variants pipeline (idempotent, bounded count 2..4).
 */
export default defineTool<
  { projectId: string; screenId: string; prompt: string; deviceType?: "mobile" | "tablet" | "desktop" | "agnostic"; count?: number },
  CreateVariantsResult
>({
  description:
    "Generate 2-4 parallel variants of an existing screen. The backend persists them as sibling versions. Returns a bounded job summary.",
  inputSchema: z.object({
    projectId: z.string(),
    screenId: z.string(),
    prompt: z.string().describe("How the variants should differ"),
    deviceType: z.enum(["mobile", "tablet", "desktop", "agnostic"]).default("desktop"),
    count: z.number().int().min(2).max(4).default(3),
  }),
  execute: (input, ctx) =>
    createVariants(
      clientFromEnv(),
      {
        projectId: input.projectId,
        screenId: input.screenId,
        prompt: input.prompt,
        deviceType: input.deviceType ?? "desktop",
        count: input.count,
      },
      { sessionId: ctx.session.id, turnId: ctx.session.turn.id },
    ),
  toModelOutput: (output) => ({ type: "text", value: output.summary }),
});
