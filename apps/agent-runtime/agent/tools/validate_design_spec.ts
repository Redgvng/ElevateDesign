import { DesignSpecSchema, type DesignSpec } from "@odc/shared";
import { summarizeDesignSpec, summarizeValidationIssues } from "../lib/model-output";

export type ValidateDesignSpecResult =
  | { valid: true; designSpec: DesignSpec; summary: string }
  | {
      valid: false;
      issues: Array<{ path: string[]; message: string }>;
      summary: string;
    };

/**
 * Validates a candidate DesignSpec against the canonical schema. Returns exact
 * issues for the repair loop plus a compact model-facing summary, so the agent
 * can fix structured output without the full Zod error tree in context.
 */
export function validateDesignSpec(input: unknown): ValidateDesignSpecResult {
  const parsed = DesignSpecSchema.safeParse(input);
  if (parsed.success) {
    return { valid: true, designSpec: parsed.data, summary: summarizeDesignSpec(parsed.data) };
  }

  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.map((segment) => String(segment)),
    message: issue.message,
  }));
  return { valid: false, issues, summary: summarizeValidationIssues(issues) };
}
