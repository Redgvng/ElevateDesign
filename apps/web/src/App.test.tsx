import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@excalidraw/excalidraw", () => ({
  convertToExcalidrawElements: (elements: ExcalidrawMockElement[]) => elements,
  Excalidraw: ({ initialData, onChange }: ExcalidrawMockProps) => (
    <div data-testid="excalidraw">
      {initialData.elements.filter((element) => element.type === "rectangle").map((element) => (
        <button
          key={element.id}
          type="button"
          onClick={() =>
            onChange(
              initialData.elements.map((currentElement) =>
                currentElement.id === element.id
                  ? { ...currentElement, x: currentElement.x + 24, y: currentElement.y + 12 }
                  : currentElement,
              ),
              { ...initialData.appState, selectedElementIds: { [element.id]: true } },
            )
          }
        >
          {element.customData?.canvasNodeTitle ?? element.id}
        </button>
      ))}
    </div>
  ),
}));

const projects = [
  {
    id: "proj_000001",
    name: "Operations Dashboard",
    slug: "operations-dashboard",
    createdAt: "2026-06-17T10:00:00.000Z",
    updatedAt: "2026-06-17T10:00:00.000Z",
    defaultDesignSystemId: null,
  },
];

const emptyCanvas = {
  id: "canvas_proj_000001",
  projectId: "proj_000001",
  schemaVersion: "1.0",
  revision: 1,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  updatedAt: "2026-06-17T10:00:00.000Z",
};

const screenVersion = {
  id: "ver_000001",
  screenId: "screen_000001",
  versionNumber: 1,
  sourcePrompt: "Create a dense SaaS monitoring dashboard",
  operation: "generate",
  designSpec: {
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
      style: {},
      content: {},
      children: [],
    },
    interactions: [],
    assets: [],
  },
  htmlCode: "<!doctype html><html><body><h1>Operations Dashboard</h1></body></html>",
  reactCode: null,
  screenshotArtifactId: null,
  parentVersionId: null,
  createdAt: "2026-06-17T10:00:00.000Z",
};

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/projects" && (!init || init.method === undefined)) {
          return jsonResponse({ projects });
        }

        if (url === "/api/projects" && init?.method === "POST") {
          return jsonResponse(
            {
              project: {
                ...projects[0],
                id: "proj_000002",
                name: "New Client Portal",
                slug: "new-client-portal",
              },
            },
            201,
          );
        }

        if (url === "/api/projects/proj_000001/generation-jobs" && init?.method === "POST") {
          return jsonResponse(
            {
              job: {
                id: "job_000001",
                projectId: "proj_000001",
                type: "generate_screen",
                status: "completed",
                prompt: "Create a dense SaaS monitoring dashboard",
                deviceType: "desktop",
                mode: "fast",
                result: { screenId: "screen_000001", screenVersionId: "ver_000001" },
                error: null,
                createdAt: "2026-06-17T10:00:00.000Z",
                updatedAt: "2026-06-17T10:00:00.000Z",
              },
              screenVersion,
            },
            201,
          );
        }

        if (url.match(/^\/api\/projects\/proj_\d+\/canvas$/) && (!init || init.method === undefined)) {
          const projectId = url.split("/")[3];
          return jsonResponse({ canvas: { ...emptyCanvas, id: `canvas_${projectId}`, projectId } });
        }

        if (url.match(/^\/api\/projects\/proj_\d+\/canvas$/) && init?.method === "PUT") {
          const projectId = url.split("/")[3];
          return jsonResponse({
            canvas: {
              ...emptyCanvas,
              id: `canvas_${projectId}`,
              projectId,
              ...JSON.parse(String(init.body)),
              updatedAt: "2026-06-17T10:01:00.000Z",
            },
          });
        }

        return jsonResponse({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("creates a project and opens the workspace shell", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Projects" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Operations Dashboard" })).toBeTruthy();

    await userEvent.type(screen.getByLabelText("Project name"), "New Client Portal");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New Client Portal" })).toBeTruthy();
    });
    expect(screen.getByRole("region", { name: "Chat" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Canvas" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Preview" })).toBeTruthy();
  });

  it("submits a generation prompt and renders the returned preview HTML", async () => {
    const generatedHtml =
      "<!doctype html><html><body><main><h1>Generated Operations Dashboard</h1></main></body></html>";
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/projects" && (!init || init.method === undefined)) {
        return jsonResponse({ projects });
      }

      if (
        url === `/api/projects/${projects[0].id}/generation-jobs` &&
        init?.method === "POST"
      ) {
        expect(JSON.parse(String(init.body))).toEqual({
          type: "generate_screen",
          prompt: "Create a dense SaaS monitoring dashboard",
          deviceType: "desktop",
          mode: "fast",
        });

        return jsonResponse(
          {
            job: {
              id: "job_000001",
              projectId: projects[0].id,
              type: "generate_screen",
              status: "completed",
              prompt: "Create a dense SaaS monitoring dashboard",
              deviceType: "desktop",
              mode: "fast",
              result: {
                screenId: "screen_000001",
                screenVersionId: "ver_000001",
              },
              error: null,
              createdAt: "2026-06-17T10:00:00.000Z",
              updatedAt: "2026-06-17T10:00:00.000Z",
            },
            screenVersion: {
              id: "ver_000001",
              screenId: "screen_000001",
              versionNumber: 1,
              sourcePrompt: "Create a dense SaaS monitoring dashboard",
              operation: "generate",
              designSpec: {
                schemaVersion: "1.0",
                title: "Generated Operations Dashboard",
                deviceType: "desktop",
                frames: [],
              },
              htmlCode: generatedHtml,
              reactCode: null,
              screenshotArtifactId: null,
              parentVersionId: null,
              createdAt: "2026-06-17T10:00:00.000Z",
            },
          },
          201,
        );
      }

      if (url === `/api/projects/${projects[0].id}/canvas` && (!init || init.method === undefined)) {
        return jsonResponse({ canvas: emptyCanvas });
      }

      if (url === `/api/projects/${projects[0].id}/canvas` && init?.method === "PUT") {
        return jsonResponse({
          canvas: {
            ...emptyCanvas,
            ...JSON.parse(String(init.body)),
            updatedAt: "2026-06-17T10:01:00.000Z",
          },
        });
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
    });

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Operations Dashboard" }));
    await userEvent.type(
      screen.getByLabelText("Prompt"),
      "Create a dense SaaS monitoring dashboard",
    );
    await userEvent.click(screen.getByRole("button", { name: "Generate screen" }));

    expect(await screen.findAllByText("Job completed")).toHaveLength(2);

    const iframe = screen.getByTitle("Generated screen preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("sandbox")).toBe("");
    expect(iframe.srcdoc).toBe(generatedHtml);
  });

  it("submits a prompt and renders the generated preview", async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Operations Dashboard" }));
    await userEvent.clear(screen.getByLabelText("Prompt"));
    await userEvent.type(screen.getByLabelText("Prompt"), "Create a dense SaaS monitoring dashboard");
    await userEvent.click(screen.getByRole("button", { name: "Generate screen" }));

    expect(await screen.findAllByText("Job completed")).toHaveLength(2);
    const preview = screen.getByTitle("Generated screen preview") as HTMLIFrameElement;
    expect(preview.getAttribute("sandbox")).toBe("");
    expect(preview.srcdoc).toContain("Operations Dashboard");
  });

  it("loads canvas, persists a generated screen node, and reopens its local version from the canvas", async () => {
    const fetchMock = vi.mocked(fetch);
    const requests: { url: string; method: string; body: unknown }[] = [];
    const generatedHtml =
      "<!doctype html><html><body><h1>Canvas selected dashboard</h1></body></html>";

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      requests.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null });

      if (url === "/api/projects" && method === "GET") {
        return jsonResponse({ projects });
      }

      if (url === `/api/projects/${projects[0].id}/canvas` && method === "GET") {
        return jsonResponse({ canvas: emptyCanvas });
      }

      if (url === `/api/projects/${projects[0].id}/generation-jobs` && method === "POST") {
        return jsonResponse(
          {
            job: {
              id: "job_000001",
              projectId: projects[0].id,
              type: "generate_screen",
              status: "completed",
              prompt: "Create a dense SaaS monitoring dashboard",
              deviceType: "desktop",
              mode: "fast",
              result: {
                screenId: "screen_000001",
                screenVersionId: "ver_000001",
              },
              error: null,
              createdAt: "2026-06-17T10:00:00.000Z",
              updatedAt: "2026-06-17T10:00:00.000Z",
            },
            screenVersion: {
              ...screenVersion,
              htmlCode: generatedHtml,
            },
          },
          201,
        );
      }

      if (url === `/api/projects/${projects[0].id}/canvas` && method === "PUT") {
        return jsonResponse({
          canvas: {
            ...emptyCanvas,
            ...JSON.parse(String(init?.body)),
            updatedAt: "2026-06-17T10:01:00.000Z",
          },
        });
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
    });

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Operations Dashboard" }));
    expect(await screen.findByTestId("excalidraw")).toBeTruthy();

    await userEvent.type(
      screen.getByLabelText("Prompt"),
      "Create a dense SaaS monitoring dashboard",
    );
    await userEvent.click(screen.getByRole("button", { name: "Generate screen" }));

    const nodeButton = await screen.findByRole("button", { name: "Operations Dashboard" });
    await userEvent.click(nodeButton);

    const putCanvas = requests.find(
      (request) => request.url === `/api/projects/${projects[0].id}/canvas` && request.method === "PUT",
    );
    expect(putCanvas?.body).toMatchObject({
      revision: 1,
      nodes: [
        {
          type: "screen",
          refId: "screen_000001",
          pinnedVersionId: null,
          title: "Operations Dashboard",
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    const preview = screen.getByTitle("Generated screen preview") as HTMLIFrameElement;
    expect(preview.srcdoc).toBe(generatedHtml);
  });

  it("rehydrates the current screen version into the preview when reopening a workspace", async () => {
    const fetchMock = vi.mocked(fetch);
    const restoredHtml =
      "<!doctype html><html><body><h1>Restored persistent dashboard</h1></body></html>";
    const persistedCanvas = {
      ...emptyCanvas,
      nodes: [
        {
          id: "node_screen_000001",
          type: "screen",
          refId: "screen_000001",
          pinnedVersionId: null,
          x: 80,
          y: 80,
          width: 260,
          height: 190,
          title: "Operations Dashboard",
          body: "Version 1",
          screenshotArtifactId: "artifact_000001",
        },
      ],
    };

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/projects" && method === "GET") {
        return jsonResponse({ projects });
      }

      if (url === `/api/projects/${projects[0].id}/canvas` && method === "GET") {
        return jsonResponse({ canvas: persistedCanvas });
      }

      if (url === `/api/projects/${projects[0].id}/screens` && method === "GET") {
        return jsonResponse({
          screens: [
            {
              screen: {
                id: "screen_000001",
                projectId: projects[0].id,
                title: "Operations Dashboard",
                deviceType: "desktop",
                currentVersionId: "ver_000001",
                createdAt: "2026-06-17T10:00:00.000Z",
                updatedAt: "2026-06-17T10:00:00.000Z",
              },
              currentVersion: {
                id: "ver_000001",
                screenId: "screen_000001",
                versionNumber: 1,
                operation: "generate",
                screenshotArtifactId: "artifact_000001",
                parentVersionId: null,
                createdAt: "2026-06-17T10:00:00.000Z",
              },
            },
          ],
        });
      }

      if (url === "/api/screen-versions/ver_000001" && method === "GET") {
        return jsonResponse({
          screenVersion: {
            ...screenVersion,
            htmlCode: restoredHtml,
            screenshotArtifactId: "artifact_000001",
          },
        });
      }

      return jsonResponse({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
    });

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Operations Dashboard" }));

    const preview = await screen.findByTitle("Generated screen preview") as HTMLIFrameElement;
    await waitFor(() => expect(preview.srcdoc).toBe(restoredHtml));
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type ExcalidrawMockElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  customData?: {
    canvasNodeTitle?: string;
  };
};

type ExcalidrawMockProps = {
  initialData: {
    elements: ExcalidrawMockElement[];
    appState: Record<string, unknown>;
  };
  onChange: (elements: ExcalidrawMockElement[], appState: Record<string, unknown>) => void;
};
