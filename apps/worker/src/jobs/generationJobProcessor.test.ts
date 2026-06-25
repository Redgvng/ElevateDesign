import { describe, expect, it } from "vitest";
import type { DesignSpec, GenerationJob } from "@odc/shared";
import { createGenerationJobProcessor, type GenerationResultPersister } from "./generationJobProcessor";

describe("createGenerationJobProcessor", () => {
  it("runs a queued generation job and persists its completed result", async () => {
    const calls: string[] = [];
    const persister: GenerationResultPersister = {
      persistCompletedGeneration: async (input) => {
        calls.push("persist");
        return {
          job: {
            ...job,
            status: "completed",
            result: { screenId: "screen_1", screenVersionId: "ver_1" },
            error: null,
          },
          screenVersion: {
            id: "ver_1",
            screenId: "screen_1",
            versionNumber: 1,
            sourcePrompt: job.prompt,
            operation: "generate",
            designSpec,
            htmlCode: input.htmlCode,
            reactCode: null,
            screenshotArtifactId: "artifact_1",
            parentVersionId: null,
            createdAt: "2026-06-18T12:00:00.000Z",
          },
        };
      },
    };

    const processor = createGenerationJobProcessor({
      provider: {
        generateStructuredDesign: async (input) => {
          calls.push(`provider:${input.prompt}`);
          return { designSpec };
        },
      },
      renderScreenshot: async ({ html, viewport }) => {
        calls.push(`render:${viewport.width}x${viewport.height}`);
        expect(html).toContain("Operations Dashboard");
        return {
          bytes: Buffer.from("fake-png"),
          mimeType: "image/png",
          width: viewport.width,
          height: viewport.height,
        };
      },
      artifactStore: {
        putObject: async ({ key, bytes }) => {
          calls.push(`upload:${key}:${bytes.toString()}`);
        },
        deleteObject: async () => {
          calls.push("delete");
        },
      },
      persister,
    });

    const result = await processor.process(job);

    expect(calls).toEqual([
      "provider:Create a dense dashboard",
      "render:1440x1024",
      "upload:generation-jobs/job_1/screenshot.png:fake-png",
      "persist",
    ]);
    expect(result.job.status).toBe("completed");
    expect(result.screenVersion.htmlCode).toContain("Operations Dashboard");
  });

  it("removes an uploaded screenshot when persistence fails", async () => {
    const calls: string[] = [];
    const processor = createGenerationJobProcessor({
      provider: {
        generateStructuredDesign: async () => ({ designSpec }),
      },
      renderScreenshot: async ({ viewport }) => ({
        bytes: Buffer.from("fake-png"),
        mimeType: "image/png",
        width: viewport.width,
        height: viewport.height,
      }),
      artifactStore: {
        putObject: async ({ key }) => {
          calls.push(`upload:${key}`);
        },
        deleteObject: async (key) => {
          calls.push(`delete:${key}`);
        },
      },
      persister: {
        persistCompletedGeneration: async () => {
          calls.push("persist");
          throw new Error("database unavailable");
        },
      },
    });

    await expect(processor.process(job)).rejects.toMatchObject({
      code: "PERSISTENCE_ERROR",
      retryable: true,
    });
    expect(calls).toEqual([
      "upload:generation-jobs/job_1/screenshot.png",
      "persist",
      "delete:generation-jobs/job_1/screenshot.png",
    ]);
  });

  it("fails before persisting when provider output is not a valid DesignSpec", async () => {
    const processor = createGenerationJobProcessor({
      provider: {
        generateStructuredDesign: async () => ({
          designSpec: { schemaVersion: "broken" } as never,
        }),
      },
      renderScreenshot: async () => {
        throw new Error("should not render invalid specs");
      },
      artifactStore: {
        putObject: async () => {
          throw new Error("should not upload invalid specs");
        },
        deleteObject: async () => {
          throw new Error("should not delete invalid specs");
        },
      },
      persister: {
        persistCompletedGeneration: async () => {
          throw new Error("should not persist invalid specs");
        },
      },
    });

    await expect(processor.process(job)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

const job: GenerationJob = {
  id: "job_1",
  projectId: "proj_1",
  type: "generate_screen",
  status: "queued",
  prompt: "Create a dense dashboard",
  deviceType: "desktop",
  mode: "fast",
  result: null,
  error: null,
  createdAt: "2026-06-18T12:00:00.000Z",
  updatedAt: "2026-06-18T12:00:00.000Z",
};

const designSpec: DesignSpec = {
  schemaVersion: "1.0",
  title: "Operations Dashboard",
  deviceType: "desktop",
  viewport: { width: 1440, height: 1024 },
  themeRefs: { designSystemId: null },
  root: {
    id: "root",
    type: "frame",
    name: "Dashboard",
    layout: { position: "relative", width: 1440, height: 1024 },
    style: { background: "#ffffff" },
    content: {},
    children: [],
  },
  interactions: [],
  assets: [],
};
