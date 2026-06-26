import { z } from "zod";
import { defineTool } from "eve/tools";
import { validateDesignSpec, type ValidateDesignSpecResult } from "../lib/validate-design-spec";

/**
 * Eve tool wrapper: validates a candidate DesignSpec against the canonical
 * schema. The model sees only the compact summary; full issues stay available
 * in the structured result for the repair loop.
 */
export default defineTool<{ designSpec: unknown }, ValidateDesignSpecResult>({
  description:
    "Validate a candidate DesignSpec against the canonical schema. Returns a compact summary; fix all issues before persisting.",
  inputSchema: z.object({
    designSpec: z.unknown().describe("The candidate DesignSpec JSON to validate"),
  }),
  execute: (input) => validateDesignSpec(input.designSpec),
  toModelOutput: (output) => ({ type: "text", value: output.summary }),
});
