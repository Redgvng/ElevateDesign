import { defineAgent } from "eve";

/**
 * Planner subagent: decomposes a design brief into a concrete screen plan
 * (intent, regions, candidate modules) before any DesignSpec is authored.
 */
export default defineAgent({
  description:
    "Decompose a design brief into a structured screen plan (intent, regions, candidate modules) the generator can author from.",
  model: "anthropic/claude-sonnet-4.5",
});
