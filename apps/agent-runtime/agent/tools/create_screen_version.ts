import { z } from "zod";
import { defineTool } from "eve/tools";
import { clientFromEnv } from "../lib/client-from-env";
import {
  createScreenVersion,
  type CreateScreenVersionResult,
} from "../lib/create-screen-version";

/**
 * Eve tool wrapper: persists an agent-authored DesignSpec as a ScreenVersion.
 * Idempotent (keyed on session/turn/base version) and guarded by validation —
 * an invalid spec is never sent to the backend.
 */
export default defineTool<
  {
    projectId: string;
    designSpec: unknown;
    sourcePrompt: string;
    baseScreenId?: string;
    baseVersionId?: string;
  },
  CreateScreenVersionResult
>({
  description:
    "Persist an authored DesignSpec as a new ScreenVersion (creates a screen, or appends an edit when baseScreenId is set). Validate first; invalid specs are rejected.",
  inputSchema: z.object({
    projectId: z.string(),
    designSpec: z.unknown().describe("The validated DesignSpec to persist"),
    sourcePrompt: z.string().describe("The brief/prompt that produced this spec"),
    baseScreenId: z.string().optional().describe("Set to append an edit to an existing screen"),
    baseVersionId: z.string().optional(),
  }),
  execute: (input, ctx) =>
    createScreenVersion(clientFromEnv(), input, {
      sessionId: ctx.session.id,
      turnId: ctx.session.turn.id,
      baseVersionId: input.baseVersionId ?? null,
    }),
  toModelOutput: (output) => ({ type: "text", value: output.summary }),
});
