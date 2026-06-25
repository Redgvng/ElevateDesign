import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN_SYSTEM } from "@odc/shared";
import { createInMemoryDesignSystemStore, type DesignSystemInput } from "./design-system-store";

const input: DesignSystemInput = {
  name: "Brand A",
  description: "Brand A system",
  tokens: DEFAULT_DESIGN_SYSTEM.tokens,
  designMarkdown: "Use bold headings.",
};

describe("in-memory design system store", () => {
  it("creates and lists design systems scoped to a project", async () => {
    const store = createInMemoryDesignSystemStore();

    const created = await store.create("proj_1", input);
    await store.create("proj_2", { ...input, name: "Other" });

    expect(created.id).toMatch(/^ds_/);
    const listed = await store.listByProject("proj_1");
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("Brand A");
  });

  it("isolates reads and updates by project", async () => {
    const store = createInMemoryDesignSystemStore();
    const created = await store.create("proj_1", input);

    expect(await store.getById("proj_2", created.id)).toBeNull();
    expect(await store.update("proj_2", created.id, input)).toBeNull();

    const updated = await store.update("proj_1", created.id, { ...input, name: "Renamed" });
    expect(updated?.name).toBe("Renamed");
    expect((await store.getById("proj_1", created.id))?.name).toBe("Renamed");
  });
});
