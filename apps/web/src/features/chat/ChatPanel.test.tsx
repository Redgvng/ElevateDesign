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
        activeScreenId={null}
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
        activeScreenId={null}
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
        activeScreenId={null}
        onSubmitPrompt={async () => undefined}
        onCancelJob={async () => undefined}
      />,
    );

    const button = screen.getByRole("button", { name: "Cancelling..." }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});

describe("ChatPanel edit mode", () => {
  it("hides the edit toggle when no screen is active", () => {
    render(
      <ChatPanel
        job={null}
        isSubmitting={false}
        isCancelling={false}
        error={null}
        activeScreenId={null}
        onSubmitPrompt={async () => undefined}
        onCancelJob={async () => undefined}
      />,
    );

    expect(screen.queryByRole("radio", { name: "Edit current" })).toBeNull();
    expect(screen.getByRole("button", { name: "Generate screen" })).toBeTruthy();
  });

  it("submits an edit prompt targeting the active screen", async () => {
    const user = userEvent.setup();
    const onSubmitPrompt = vi.fn(async () => undefined);

    render(
      <ChatPanel
        job={null}
        isSubmitting={false}
        isCancelling={false}
        error={null}
        activeScreenId="screen_42"
        onSubmitPrompt={onSubmitPrompt}
        onCancelJob={async () => undefined}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Edit current" }));
    await user.type(screen.getByLabelText("Edit prompt"), "Tighten the spacing");
    await user.click(screen.getByRole("button", { name: "Edit screen" }));

    expect(onSubmitPrompt).toHaveBeenCalledWith("Tighten the spacing", {
      kind: "edit",
      screenId: "screen_42",
    });
  });

  it("submits a variants request for the active screen", async () => {
    const user = userEvent.setup();
    const onSubmitPrompt = vi.fn(async () => undefined);

    render(
      <ChatPanel
        job={null}
        isSubmitting={false}
        isCancelling={false}
        error={null}
        activeScreenId="screen_42"
        onSubmitPrompt={onSubmitPrompt}
        onCancelJob={async () => undefined}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Variants" }));
    await user.type(screen.getByLabelText("Variants prompt"), "Explore layouts");
    await user.click(screen.getByRole("button", { name: "Generate variants" }));

    expect(onSubmitPrompt).toHaveBeenCalledWith("Explore layouts", {
      kind: "variants",
      screenId: "screen_42",
    });
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
