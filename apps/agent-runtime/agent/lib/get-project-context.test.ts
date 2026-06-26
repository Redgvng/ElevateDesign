import { describe, expect, it } from "vitest";
import type { OdcApiClient } from "./odc-api-client";
import { getProjectContext } from "./get-project-context";

const fakeClient = {
  async getProjectContext() {
    return {
      project: { id: "p1", name: "Acme", slug: "acme", createdAt: "", updatedAt: "", defaultDesignSystemId: null },
      screens: [
        {
          screen: {
            id: "s1",
            projectId: "p1",
            title: "Dashboard",
            deviceType: "desktop" as const,
            currentVersionId: "v1",
            createdAt: "",
            updatedAt: "",
          },
          currentVersion: {
            id: "v1",
            screenId: "s1",
            versionNumber: 3,
            operation: "edit" as const,
            screenshotArtifactId: null,
            parentVersionId: null,
            createdAt: "",
          },
        },
      ],
      designSystems: [
        { id: "ds1", name: "Brand", description: "d", tokens: {} as never, designMarkdown: "" },
      ],
    };
  },
} as unknown as OdcApiClient;

describe("getProjectContext tool", () => {
  it("returns a redacted, bounded view without full specs or tokens", async () => {
    const view = await getProjectContext(fakeClient, "p1");

    expect(view.projectName).toBe("Acme");
    expect(view.screens).toEqual([
      { screenId: "s1", title: "Dashboard", currentVersionNumber: 3 },
    ]);
    expect(view.designSystems).toEqual([{ id: "ds1", name: "Brand" }]);
    expect(view.summary).toContain('project="Acme"');
    expect(JSON.stringify(view)).not.toContain("designMarkdown");
    expect(JSON.stringify(view)).not.toContain("tokens");
  });
});
