import { z } from "zod";
import { defineTool } from "eve/tools";
import { clientFromEnv } from "../lib/client-from-env";
import { prepareExport, type ExportFormat, type PrepareExportResult } from "../lib/prepare-export";

/**
 * Eve tool wrapper: prepares an export plan for a screen version (formats +
 * filenames). Download artifacts stay in the backend/web export flow.
 */
export default defineTool<
  { screenVersionId: string; formats?: ExportFormat[] },
  PrepareExportResult
>({
  description:
    "Prepare an export plan (formats + filenames) for a screen version. Does not produce downloads; those stay in the product export flow.",
  inputSchema: z.object({
    screenVersionId: z.string(),
    formats: z.array(z.enum(["html", "react", "vite-zip"])).optional(),
  }),
  execute: (input) => prepareExport(clientFromEnv(), input.screenVersionId, input.formats),
  toModelOutput: (output) => ({ type: "text", value: output.summary }),
});
