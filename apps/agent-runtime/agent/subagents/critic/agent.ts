import { defineAgent } from "eve";

/**
 * Critic subagent: reviews a generated screen (spec summary, screenshot, logs)
 * and reports concrete, actionable defects or accepts it.
 */
export default defineAgent({
  description:
    "Critique a generated screen against hierarchy, density, consistency and completeness; report actionable defects or accept.",
  model: "anthropic/claude-sonnet-4.5",
});
