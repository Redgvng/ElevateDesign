import { defineAgent } from "eve";

/**
 * Eve agent for Open Design Canvas. The product backend remains the source of
 * truth for projects, jobs, screens, versions, artifacts and auth; this agent
 * only orchestrates generation/critique/export through approved typed tools.
 *
 * Identity (agent name) is derived at compile time from the package name
 * (@odc/agent-runtime), so no `name` field is authored here.
 */
export default defineAgent({
  model: "anthropic/claude-sonnet-4.5",
});
