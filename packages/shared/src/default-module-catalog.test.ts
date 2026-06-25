import { describe, expect, it } from "vitest";
import { DefaultModuleCatalog } from "./default-module-catalog";
import { ModuleDefinitionSchema } from "./module-catalog";

describe("DefaultModuleCatalog", () => {
  it("contains the MVP priority-one modules", () => {
    expect(DefaultModuleCatalog.map((module) => module.id)).toEqual([
      "app-shell.sidebar-dashboard",
      "dashboard.metric-overview",
      "data-display.table-with-filters",
      "form.settings-form",
      "feedback.empty-state-action",
      "feedback.error-state-retry",
    ]);
  });

  it("keeps every module valid and data-only", () => {
    for (const module of DefaultModuleCatalog) {
      expect(ModuleDefinitionSchema.safeParse(module).success, module.id).toBe(true);
      expect(JSON.stringify(module)).not.toContain("function");
      expect(JSON.stringify(module)).not.toContain("=>");
      expect(JSON.stringify(module)).not.toContain("import ");
    }
  });

  it("uses unique module and variant identifiers", () => {
    const moduleIds = new Set<string>();
    for (const module of DefaultModuleCatalog) {
      expect(moduleIds.has(module.id)).toBe(false);
      moduleIds.add(module.id);

      const variantIds = new Set<string>();
      for (const variant of module.variants) {
        expect(variantIds.has(variant.id), `${module.id}:${variant.id}`).toBe(false);
        variantIds.add(variant.id);
      }
      expect(module.variants).toHaveLength(4);
      expect(module.shadcnHints.registryItems.length, module.id).toBeGreaterThan(0);
      for (const registryItem of module.shadcnHints.registryItems) {
        expect(registryItem).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
      }
      for (const variant of module.variants) {
        expect(variant.promptSignals.length, `${module.id}:${variant.id}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
