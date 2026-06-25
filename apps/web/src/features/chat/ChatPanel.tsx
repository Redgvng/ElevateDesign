import { FormEvent, useId, useState } from "react";
import type { GenerationJob } from "@odc/shared";

type ChatPanelProps = {
  job: GenerationJob | null;
  isSubmitting: boolean;
  error: string | null;
  isCancelling: boolean;
  onSubmitPrompt: (prompt: string) => Promise<void>;
  onCancelJob: () => Promise<void>;
};

export function ChatPanel({
  job,
  isSubmitting,
  error,
  isCancelling,
  onSubmitPrompt,
  onCancelJob,
}: ChatPanelProps) {
  const promptId = useId();
  const [prompt, setPrompt] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSubmitting) {
      return;
    }

    await onSubmitPrompt(trimmedPrompt);
  }

  const canSubmit = Boolean(prompt.trim()) && !isSubmitting;

  return (
    <section className="workspace-panel chat-panel" aria-label="Chat">
      <div className="panel-header">
        <h2>Chat</h2>
        <span>{job ? formatStatus(job.status) : "Prompt"}</span>
      </div>

      <div className="chat-thread" aria-live="polite">
        <div className="chat-message system-message">
          Describe a screen to generate. The backend creates a DesignSpec-backed screen version and
          the preview renders its generated HTML in isolation.
        </div>

        {job ? (
          <div className="chat-message job-message">
            <span className={`job-status job-status-${job.status}`}>{formatStatus(job.status)}</span>
            <strong>{job.prompt}</strong>
            {job.id !== "pending" && (job.status === "queued" || job.status === "running") ? (
              <button
                className="cancel-job-button"
                type="button"
                disabled={isCancelling}
                onClick={() => void onCancelJob()}
              >
                {isCancelling ? "Cancelling..." : "Cancel generation"}
              </button>
            ) : null}
            {job.error ? <span className="job-error">{job.error.message}</span> : null}
          </div>
        ) : null}

        {error ? <div className="error-banner compact-error">{error}</div> : null}
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <label htmlFor={promptId}>Prompt</label>
        <textarea
          id={promptId}
          rows={5}
          value={prompt}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          placeholder="Create a dense SaaS monitoring dashboard"
          disabled={isSubmitting}
        />
        <button type="submit" disabled={!canSubmit}>
          {isSubmitting ? "Generating..." : "Generate screen"}
        </button>
      </form>
    </section>
  );
}

function formatStatus(status: GenerationJob["status"]): string {
  switch (status) {
    case "queued":
      return "Job queued";
    case "running":
      return "Job running";
    case "completed":
      return "Job completed";
    case "failed":
      return "Job failed";
    case "cancelled":
      return "Job cancelled";
  }
}
