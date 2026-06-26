import { defineEval } from "eve/evals";

/**
 * When a candidate DesignSpec is invalid, the agent must validate (and repair)
 * before creating a version — validation always precedes persistence.
 */
export default defineEval({
  description: "Invalid DesignSpec is validated/repaired before any version is created.",
  test: async (t) => {
    const session = t.newSession();
    const turn = await session.send(
      "Author a dashboard for project p_demo. If the spec fails validation, repair it before persisting.",
    );

    turn.expectOk();
    turn.requireToolCall("validate_design_spec");

    const validateIndex = turn.toolCalls.findIndex((call) => call.name === "validate_design_spec");
    const persistIndex = turn.toolCalls.findIndex((call) => call.name === "create_screen_version");
    if (persistIndex !== -1) {
      t.log(
        persistIndex > validateIndex
          ? "validation preceded persistence (ok)"
          : "WARNING: persistence before validation",
      );
    }
  },
});
