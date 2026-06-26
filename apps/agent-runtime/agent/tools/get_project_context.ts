import { z } from "zod";
import { defineTool } from "eve/tools";
import { clientFromEnv } from "../lib/client-from-env";
import { getProjectContext, type ProjectContextView } from "../lib/get-project-context";

/**
 * Eve tool wrapper: read-only project context. Redacts everything the model
 * does not need and returns a bounded summary.
 */
export default defineTool<{ projectId: string }, ProjectContextView>({
  description:
    "Read-only context for a project (name, screens with current version numbers, design systems). Use it to orient before authoring.",
  inputSchema: z.object({
    projectId: z.string().describe("The project id to load context for"),
  }),
  execute: (input) => getProjectContext(clientFromEnv(), input.projectId),
  toModelOutput: (output) => ({ type: "text", value: output.summary }),
});
