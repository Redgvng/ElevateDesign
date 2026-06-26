import { defineEval } from "eve/evals";

/**
 * A simple dashboard request must complete and call validation before it ever
 * persists a screen version.
 */
export default defineEval({
  description: "Simple dashboard request completes and validates before persisting.",
  test: async (t) => {
    const session = t.newSession();
    const turn = await session.send(
      "Create a simple SaaS dashboard for project p_demo and persist it as a screen version.",
    );

    turn.expectOk();
    turn.requireToolCall("validate_design_spec");
    turn.requireToolCall("create_screen_version");
  },
});
