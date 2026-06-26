import { describe, expect, it } from "vitest";
import { buildScreenPlan, selectModuleCandidates } from "./selectModules";

describe("selectModuleCandidates", () => {
  it("selects dashboard-oriented modules for monitoring prompts", () => {
    const selected = selectModuleCandidates({
      prompt: "Create a dense SaaS monitoring dashboard with metrics and a filtered incidents table",
      deviceType: "desktop",
      maxModules: 4,
    });

    expect(selected.map((candidate) => candidate.module.id)).toEqual(
      expect.arrayContaining([
        "app-shell.sidebar-dashboard",
        "dashboard.metric-overview",
        "data-display.table-with-filters",
      ]),
    );
    expect(selected).toHaveLength(4);
  });

  it("selects settings and form modules for configuration prompts", () => {
    const selected = selectModuleCandidates({
      prompt: "Build an account settings screen for workspace preferences and profile configuration",
      deviceType: "desktop",
      maxModules: 3,
    });

    expect(selected[0]?.module.id).toBe("form.settings-form");
    expect(selected.map((candidate) => candidate.module.family)).toContain("feedback");
  });

  it("excludes modules that do not support the requested device", () => {
    const selected = selectModuleCandidates({
      prompt: "Create a mobile dashboard with metrics and filters",
      deviceType: "mobile",
      maxModules: 6,
    });

    expect(selected.map((candidate) => candidate.module.id)).not.toContain(
      "app-shell.sidebar-dashboard",
    );
    expect(selected.map((candidate) => candidate.module.id)).not.toContain(
      "data-display.table-with-filters",
    );
  });

  it("returns a bounded diverse fallback for vague prompts", () => {
    const selected = selectModuleCandidates({
      prompt: "Create a useful product screen",
      deviceType: "desktop",
      maxModules: 4,
    });

    expect(selected).toHaveLength(4);
    expect(new Set(selected.map((candidate) => candidate.module.family)).size).toBeGreaterThan(1);
  });

  it("selects module variants from prompt-specific creative signals", () => {
    const commandCenter = selectModuleCandidates({
      prompt: "Create an incident command center with live queue, escalation lane and operational status board",
      deviceType: "desktop",
      maxModules: 4,
    }).find((candidate) => candidate.module.id === "dashboard.metric-overview");
    const executive = selectModuleCandidates({
      prompt: "Create an executive reporting dashboard with board-ready summaries and weekly performance story",
      deviceType: "desktop",
      maxModules: 4,
    }).find((candidate) => candidate.module.id === "dashboard.metric-overview");
    const inspector = selectModuleCandidates({
      prompt: "Create a split-pane workspace with inspector panel, canvas context and command actions",
      deviceType: "desktop",
      maxModules: 4,
    }).find((candidate) => candidate.module.id === "app-shell.sidebar-dashboard");

    expect(commandCenter?.selectedVariantId).toBe("incident-command");
    expect(executive?.selectedVariantId).toBe("executive-story");
    expect(inspector?.selectedVariantId).toBe("inspector-workbench");
  });
});

describe("buildScreenPlan", () => {
  it("produces a traceable plan mirroring the selected candidates", () => {
    const input = {
      prompt: "Create a dense SaaS monitoring dashboard with metrics and a filtered incidents table",
      deviceType: "desktop" as const,
      maxModules: 4,
    };
    const plan = buildScreenPlan(input);
    const candidates = selectModuleCandidates(input);

    expect(plan.prompt).toBe(input.prompt);
    expect(plan.deviceType).toBe("desktop");
    expect(plan.modules.map((module) => module.moduleId)).toEqual(
      candidates.map((candidate) => candidate.module.id),
    );
    expect(plan.modules[0]).toMatchObject({
      variantId: candidates[0].selectedVariantId,
      score: candidates[0].score,
    });
  });
});
