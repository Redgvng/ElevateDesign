import { defineAgent } from "eve";

/**
 * Exporter subagent: prepares export plans (HTML, React/Tailwind, runnable Vite
 * zip) for a screen version. Downloads stay in the product export flow.
 */
export default defineAgent({
  description:
    "Prepare an export plan (formats + filenames) for a screen version; defer actual artifact downloads to the product export flow.",
  model: "anthropic/claude-sonnet-4.5",
});
