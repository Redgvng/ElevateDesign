import { defineAgent } from "eve";

/**
 * Generator subagent: authors and repairs a DesignSpec from a plan, validating
 * before persisting a ScreenVersion.
 */
export default defineAgent({
  description:
    "Author and repair a DesignSpec from a plan; validate, optionally compile a preview, then persist a ScreenVersion.",
  model: "anthropic/claude-sonnet-4.5",
});
