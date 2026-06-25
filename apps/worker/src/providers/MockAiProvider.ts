import type { DesignSpec } from "@odc/shared";
import type { AiProvider, GenerateDesignInput, GenerateDesignOutput } from "./AiProvider";

export class MockAiProvider implements AiProvider {
  async generateStructuredDesign(input: GenerateDesignInput): Promise<GenerateDesignOutput> {
    if (input.type === "edit_screen" && input.baseDesignSpec) {
      const editedTitle = `${input.baseDesignSpec.title} (edited)`;
      return {
        designSpec: {
          ...input.baseDesignSpec,
          title: editedTitle,
          root: {
            ...input.baseDesignSpec.root,
            name: editedTitle,
          },
        },
      };
    }

    if (input.type === "generate_variants" && input.baseDesignSpec) {
      const variantTitle = `${input.baseDesignSpec.title} · Variant ${(input.variantIndex ?? 0) + 1}`;
      return {
        designSpec: {
          ...input.baseDesignSpec,
          title: variantTitle,
          root: {
            ...input.baseDesignSpec.root,
            name: variantTitle,
          },
        },
      };
    }

    const designSpec: DesignSpec = {
      schemaVersion: "1.0",
      title: "Operations Dashboard",
      deviceType: input.deviceType,
      viewport: { width: 1440, height: 1024 },
      themeRefs: { designSystemId: null },
      root: {
        id: "root",
        type: "frame",
        name: "Operations Dashboard",
        layout: {
          position: "relative",
          width: 1440,
          height: 1024,
          direction: "column",
          gap: 24,
          padding: { top: 32, right: 32, bottom: 32, left: 32 },
        },
        style: { background: "#f8fafc", foreground: "#111827" },
        content: {},
        children: [
          {
            id: "title",
            type: "text",
            name: "Page title",
            layout: { position: "relative", width: "fill", height: "hug" },
            style: { typography: { fontSize: 36, fontWeight: 760, lineHeight: 1.1 } },
            content: { text: "Operations Dashboard" },
            children: [],
          },
          {
            id: "summary",
            type: "stack",
            name: "Metric summary",
            layout: { position: "relative", width: "fill", height: "hug", direction: "row", gap: 16 },
            style: {},
            content: {},
            children: ["Active incidents", "SLA health", "Deploy velocity"].map((label, index) => ({
              id: `metric-${index + 1}`,
              type: "card",
              name: label,
              layout: { position: "relative", width: "fill", height: 148 },
              style: { background: "#ffffff", borderColor: "#d8dde6", borderWidth: 1, radius: 8 },
              content: { text: `${label}: ${index === 0 ? "7" : index === 1 ? "99.4%" : "42/week"}` },
              children: [],
            })),
          },
          {
            id: "table",
            type: "table",
            name: "Service table",
            layout: { position: "relative", width: "fill", height: 420 },
            style: { background: "#ffffff", borderColor: "#d8dde6", borderWidth: 1, radius: 8 },
            content: { text: "Services: API Gateway, Billing, Search, Notifications" },
            children: [],
          },
        ],
      },
      interactions: [],
      assets: [],
    };

    return {
      designSpec,
    };
  }
}
