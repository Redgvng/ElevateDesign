import type { GenerationJob } from "@odc/shared";

export type EveGenerationDispatcher = {
  /**
   * Hands a queued generation job to the Eve runtime instead of the legacy
   * provider/worker path. Eve orchestrates generation and persists the result
   * via the approved backend tools (the backend stays the source of truth).
   */
  dispatch(job: Pick<GenerationJob, "id" | "projectId" | "type" | "prompt" | "deviceType">): Promise<void>;
};

type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number }>;

/**
 * Starts an Eve session for the job by POSTing to the Eve HTTP channel. The
 * message tells the agent which job/project to generate for; Eve then calls the
 * backend tools (create_screen_version) to persist the result.
 */
export function createHttpEveGenerationDispatcher(
  dispatchUrl: string,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
): EveGenerationDispatcher {
  const root = dispatchUrl.replace(/\/+$/, "");
  return {
    async dispatch(job) {
      const message =
        `Generation job ${job.id} for project ${job.projectId} ` +
        `(${job.type}, ${job.deviceType}). Author and persist a screen for: ${job.prompt}`;
      const response = await fetchImpl(`${root}/eve/v1/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, metadata: { jobId: job.id, projectId: job.projectId } }),
      });
      if (!response.ok) {
        throw new Error(`Eve dispatch failed for job ${job.id}: ${response.status}`);
      }
    },
  };
}
