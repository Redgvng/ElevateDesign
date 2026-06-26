import { z } from "zod";
import { defineTool } from "eve/tools";
import { compilePreview, type CompilePreviewResult } from "../lib/compile-preview";

/**
 * Eve tool wrapper: deterministically compiles a DesignSpec to HTML and reports
 * compilation success and output size. The model never receives the full HTML.
 */
export default defineTool<{ designSpec: unknown }, CompilePreviewResult>({
  description:
    "Compile a DesignSpec to HTML deterministically and report success + output size. Use to confirm a spec compiles before persisting.",
  inputSchema: z.object({
    designSpec: z.unknown().describe("The DesignSpec to compile"),
  }),
  execute: (input) => compilePreview(input.designSpec),
  toModelOutput: (output) => ({ type: "text", value: output.summary }),
});
