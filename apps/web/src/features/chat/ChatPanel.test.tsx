import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GenerationJob } from "@odc/shared";
import { ChatPanel } from "./ChatPanel";

afterEach(() => cleanup());

describe("ChatPanel cancellation", () => {
  it("offers cancellation for a persisted queued job", async () => {
    const user = userEvent.setup();
    const onCancelJob = vi.fn(async () => undefined);

    render(
      <ChatPanel
        job={job}
        isSubmitting
        isCancelling={false}
        error={null}
        onSubmitPrompt={async () => undefined}
        onCancelJob={onCancelJob}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel generation" }));
    expect(onCancelJob).toHaveBeenCalledOnce();
  });

  it("does not offer cancellation before the real job id exists", () => {
    render(
      <ChatPanel
        job={{ ...job, id: "pending" }}
        isSubmitting
        isCancelling={false}
        error={null}
        onSubmitPrompt={async () => undefined}
        onCancelJob={async () => undefined}
      />,
    );

    expect(screen.queryByRole("button", { name: "Cancel generation" })).toBeNull();
  });

  it("disables cancellation while the request is in flight", () => {
    render(
      <ChatPanel
        job={{ ...job, status: "running" }}
        isSubmitting
        isCancelling
        error={null}
        onSubmitPrompt={async () => undefined}
        onCancelJob={async () => undefined}
      />,
    );

    const button = screen.getByRole("button", { name: "Cancelling..." }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});

const job: GenerationJob = {
  id: "job_1",
  projectId: "proj_1",
  type: "generate_screen",
  status: "queued",
  prompt: "Create a dashboard",
  deviceType: "desktop",
  mode: "fast",
  result: null,
  error: null,
  createdAt: "2026-06-18T10:00:00.000Z",
  updatedAt: "2026-06-18T10:00:00.000Z",
};
