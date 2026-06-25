import { describe, expect, it } from "vitest";
import { ModuleDefinitionSchema } from "./module-catalog";

describe("ModuleDefinitionSchema", () => {
  it("accepts a valid data-only module definition", () => {
    const result = ModuleDefinitionSchema.safeParse(validModuleDefinition());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.id).toBe("dashboard.metric-overview");
    expect(result.data.shadcnHints.primitives).toEqual(["Card", "Chart", "Table"]);
  });

  it("rejects module ids that are not stable family.slug identifiers", () => {
    const result = ModuleDefinitionSchema.safeParse({
      ...validModuleDefinition(),
      id: "Dashboard Metric Overview",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join("."))).toContain("id");
  });

  it("rejects duplicate variant ids", () => {
    const module = validModuleDefinition();
    const result = ModuleDefinitionSchema.safeParse({
      ...module,
      variants: [
        module.variants[0],
        {
          ...module.variants[1],
          id: module.variants[0].id,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "Module variant ids must be unique",
    );
  });

  it("bounds slots, variants and prompt signals", () => {
    const result = ModuleDefinitionSchema.safeParse({
      ...validModuleDefinition(),
      slots: Array.from({ length: 13 }, (_, index) => ({
        id: `slot-${index}`,
        required: false,
        accepts: ["text"],
      })),
      variants: [],
      selectionHeuristics: {
        positivePromptSignals: [],
        negativePromptSignals: [],
        compatibleFamilies: [],
        incompatibleFamilies: [],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["slots", "variants", "selectionHeuristics.positivePromptSignals"]),
    );
  });

  it("requires prompt signals on every variant", () => {
    const module = validModuleDefinition();
    const result = ModuleDefinitionSchema.safeParse({
      ...module,
      variants: [
        {
          ...module.variants[0],
          promptSignals: [],
        },
        module.variants[1],
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
      "variants.0.promptSignals",
    );
  });
});

function validModuleDefinition() {
  return {
    id: "dashboard.metric-overview",
    version: "1.0.0",
    family: "dashboard",
    name: "Metric Overview",
    description: "KPI cards with a primary chart and supporting operational data.",
    intentTags: ["dashboard", "metrics", "monitoring"],
    useWhen: ["The user asks for a SaaS dashboard or monitoring overview."],
    avoidWhen: ["The user asks for an authentication or pricing screen."],
    deviceSupport: ["desktop", "tablet"],
    slots: [
      {
        id: "metrics",
        required: true,
        accepts: ["stat-card"],
        minItems: 3,
        maxItems: 6,
      },
      {
        id: "primary-visualization",
        required: true,
        accepts: ["chart", "table"],
      },
    ],
    variants: [
      {
        id: "ops-dense",
        label: "Ops Dense",
        density: "compact",
        composition: "Sidebar shell with compact metrics, incident table and chart cluster.",
        bestFor: ["operations", "monitoring", "incident response"],
        promptSignals: ["dense", "ops", "incident"],
        variationAxes: {
          hierarchy: "data-led",
          navigation: "sidebar",
          contentVolume: "high",
          visualTone: "calm technical",
        },
      },
      {
        id: "executive-balanced",
        label: "Executive Balanced",
        density: "comfortable",
        composition: "Metric cards above a single chart and summarized table.",
        bestFor: ["executive dashboard", "weekly reporting"],
        promptSignals: ["executive", "summary", "reporting"],
        variationAxes: {
          hierarchy: "summary-led",
          navigation: "topbar",
          contentVolume: "medium",
          visualTone: "enterprise",
        },
      },
    ],
    selectionHeuristics: {
      positivePromptSignals: ["dashboard", "metrics", "monitoring"],
      negativePromptSignals: ["login", "pricing"],
      compatibleFamilies: ["app-shell", "data-display", "feedback"],
      incompatibleFamilies: ["auth", "pricing"],
    },
    designSpecHints: {
      allowedNodeTypes: ["frame", "stack", "card", "chart", "table", "text"],
      maxDepth: 8,
      responsiveBehavior: ["Collapse metric grid to one column on mobile."],
    },
    shadcnHints: {
      primitives: ["Card", "Chart", "Table"],
      registryItems: ["card", "chart", "table"],
      compositionNotes: ["Use Card for metric containers and Table for operational rows."],
    },
    accessibilityNotes: ["Charts need text summaries."],
  };
}
