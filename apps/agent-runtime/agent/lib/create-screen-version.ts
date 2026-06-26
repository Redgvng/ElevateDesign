import { idempotencyKey, type IdempotencyContext } from "./idempotency";
import type { OdcApiClient } from "./odc-api-client";
import { validateDesignSpec } from "./validate-design-spec";

export type CreateScreenVersionInput = {
  projectId: string;
  designSpec: unknown;
  sourcePrompt: string;
  baseScreenId?: string;
  baseVersionId?: string;
};

export type CreateScreenVersionResult =
  | {
      created: true;
      screenId: string;
      screenVersionId: string;
      versionNumber: number;
      summary: string;
    }
  | { created: false; reason: "invalid_spec"; summary: string };

/**
 * Idempotent, mutating tool: persists an agent-authored DesignSpec as a
 * ScreenVersion through the backend. Guarded by validation — an invalid spec is
 * never sent to the backend, so the agent must repair before persisting.
 */
export async function createScreenVersion(
  client: OdcApiClient,
  input: CreateScreenVersionInput,
  context: IdempotencyContext,
): Promise<CreateScreenVersionResult> {
  const validation = validateDesignSpec(input.designSpec);
  if (!validation.valid) {
    return { created: false, reason: "invalid_spec", summary: validation.summary };
  }

  const key = idempotencyKey("create_screen_version", {
    ...context,
    baseVersionId: input.baseVersionId ?? context.baseVersionId ?? null,
  });

  const { screen, screenVersion } = await client.createScreenVersion(
    input.projectId,
    {
      designSpec: validation.designSpec,
      sourcePrompt: input.sourcePrompt,
      baseScreenId: input.baseScreenId,
      baseVersionId: input.baseVersionId,
    },
    key,
  );

  return {
    created: true,
    screenId: screen.id,
    screenVersionId: screenVersion.id,
    versionNumber: screenVersion.versionNumber,
    summary: `version ${screenVersion.versionNumber} (${screenVersion.operation}) on screen ${screen.id}`,
  };
}
