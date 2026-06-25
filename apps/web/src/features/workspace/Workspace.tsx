import { useEffect, useState } from "react";
import type { CanvasDocument, GenerationJob, Project, ScreenVersion } from "@odc/shared";
import { ChatPanel } from "../chat/ChatPanel";
import { CanvasWorkspace } from "../canvas/CanvasWorkspace";
import { createScreenCanvasNode } from "../canvas/canvasMapping";
import { PreviewPanel } from "../preview/PreviewPanel";

type WorkspaceProps = {
  project: Project;
  onBack: () => void;
};

export function Workspace({ project, onBack }: WorkspaceProps) {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [screenVersion, setScreenVersion] = useState<ScreenVersion | null>(null);
  const [screenVersionsById, setScreenVersionsById] = useState<Record<string, ScreenVersion>>({});
  const [canvasDocument, setCanvasDocument] = useState<CanvasDocument | null>(null);
  const [canvasStatus, setCanvasStatus] = useState("Loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCanvas() {
      setCanvasDocument(null);
      setCanvasStatus("Loading");

      try {
        const data = await requestJson<CanvasResponse>(`/api/projects/${project.id}/canvas`);
        if (isMounted) {
          setCanvasDocument(data.canvas);
          setCanvasStatus(formatCanvasStatus(data.canvas));
          void hydrateInitialPreview(data.canvas).catch((caught) => {
            if (isMounted) {
              setError(getErrorMessage(caught, "Could not rehydrate preview."));
            }
          });
        }
      } catch (caught) {
        if (isMounted) {
          setCanvasStatus(getErrorMessage(caught, "Canvas unavailable"));
        }
      }
    }

    void loadCanvas();

    return () => {
      isMounted = false;
    };
  }, [project.id]);

  async function hydrateInitialPreview(canvas: CanvasDocument) {
    const firstScreenNode = canvas.nodes.find((node) => node.type === "screen" && node.refId);
    if (!firstScreenNode?.refId) return;

    const screensResponse = await requestJson<ProjectScreensResponse>(
      `/api/projects/${project.id}/screens`,
    );
    const matchingScreen = screensResponse.screens.find(
      (entry) => entry.screen.id === firstScreenNode.refId,
    );
    const versionId =
      firstScreenNode.pinnedVersionId ??
      matchingScreen?.currentVersion?.id ??
      matchingScreen?.screen.currentVersionId;

    if (!versionId) return;

    const version = await fetchScreenVersion(versionId);
    rememberScreenVersion(version);
    setScreenVersion(version);
  }

  async function submitPrompt(prompt: string) {
    const optimisticJob = createOptimisticJob(project.id, prompt);

    setJob(optimisticJob);
    setScreenVersion(null);
    setIsSubmitting(true);
    setIsCancelling(false);
    setError(null);

    try {
      const created = await requestJson<GenerationJobResponse>(
        `/api/projects/${project.id}/generation-jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "generate_screen",
            prompt,
            deviceType: "desktop",
            mode: "fast",
          }),
        },
      );

      const completedScreenVersion = await settleGeneration(created);
      if (completedScreenVersion) {
        rememberScreenVersion(completedScreenVersion);
        addScreenVersionToCanvas(completedScreenVersion);
      }
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not generate screen."));
      setJob({
        ...optimisticJob,
        status: "failed",
        error: {
          code: "REQUEST_FAILED",
          message: getErrorMessage(caught, "Could not generate screen."),
        },
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelGeneration() {
    if (!job || job.id === "pending") return;
    if (job.status !== "queued" && job.status !== "running") return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await requestJson<GenerationJobResponse>(
        `/api/generation-jobs/${job.id}/cancel`,
        { method: "POST" },
      );
      setJob(response.job);
      setScreenVersion(null);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not cancel generation."));
    } finally {
      setIsCancelling(false);
    }
  }

  async function settleGeneration(initialResponse: GenerationJobResponse) {
    setJob(initialResponse.job);
    setScreenVersion(initialResponse.screenVersion ?? null);
    if (initialResponse.screenVersion) {
      rememberScreenVersion(initialResponse.screenVersion);
    }

    let currentJob = initialResponse.job;
    let currentScreenVersion = initialResponse.screenVersion ?? null;
    while (currentJob.status === "queued" || currentJob.status === "running") {
      await delay(800);
      const nextResponse = await requestJson<GenerationJobResponse>(
        `/api/generation-jobs/${currentJob.id}`,
      );
      currentJob = nextResponse.job;
      currentScreenVersion = nextResponse.screenVersion ?? currentScreenVersion;
      setJob(nextResponse.job);
      setScreenVersion(nextResponse.screenVersion ?? null);
      if (nextResponse.screenVersion) {
        rememberScreenVersion(nextResponse.screenVersion);
      }
    }

    if (currentJob.status !== "completed") return null;
    if (currentScreenVersion) return currentScreenVersion;
    if (!currentJob.result?.screenVersionId) return null;

    const hydratedVersion = await fetchScreenVersion(currentJob.result.screenVersionId);
    rememberScreenVersion(hydratedVersion);
    setScreenVersion(hydratedVersion);
    return hydratedVersion;
  }

  function rememberScreenVersion(version: ScreenVersion) {
    setScreenVersionsById((currentVersions) => ({
      ...currentVersions,
      [version.id]: version,
    }));
  }

  function addScreenVersionToCanvas(version: ScreenVersion) {
    setCanvasDocument((currentCanvas) => {
      if (!currentCanvas) return currentCanvas;
      if (currentCanvas.nodes.some((node) => node.type === "screen" && node.refId === version.screenId)) {
        return currentCanvas;
      }

      const nextCanvas: CanvasDocument = {
        ...currentCanvas,
        nodes: [
          ...currentCanvas.nodes,
          createScreenCanvasNode({
            screenId: version.screenId,
            versionNumber: version.versionNumber,
            title: version.designSpec.title,
            screenshotArtifactId: version.screenshotArtifactId,
            index: currentCanvas.nodes.length,
          }),
        ],
      };

      void persistCanvas(nextCanvas);
      return nextCanvas;
    });
  }

  function handleCanvasChange(nextCanvas: CanvasDocument) {
    setCanvasDocument(nextCanvas);
    void persistCanvas(nextCanvas);
  }

  function handleCanvasNodeSelect(node: CanvasDocument["nodes"][number]) {
    if (node.type !== "screen" || !node.refId) return;

    const localVersion = node.pinnedVersionId
      ? screenVersionsById[node.pinnedVersionId]
      : Object.values(screenVersionsById)
          .filter((version) => version.screenId === node.refId)
          .sort((left, right) => right.versionNumber - left.versionNumber)[0];

    if (localVersion) {
      setScreenVersion(localVersion);
      return;
    }

    const versionIdPromise = node.pinnedVersionId
      ? Promise.resolve(node.pinnedVersionId)
      : fetchScreen(node.refId).then((response) => response.screen.currentVersionId);

    void versionIdPromise
      .then(fetchScreenVersion)
        .then((version) => {
          rememberScreenVersion(version);
          setScreenVersion(version);
        })
        .catch((caught) => {
          setError(getErrorMessage(caught, "Could not load screen version."));
        });
  }

  async function persistCanvas(nextCanvas: CanvasDocument) {
    try {
      const data = await requestJson<CanvasResponse>(`/api/projects/${project.id}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: nextCanvas.revision,
          nodes: nextCanvas.nodes,
          edges: nextCanvas.edges,
          viewport: nextCanvas.viewport,
        }),
      });
      setCanvasDocument(data.canvas);
      setCanvasStatus(formatCanvasStatus(data.canvas));
    } catch (caught) {
      setCanvasStatus(getErrorMessage(caught, "Canvas save failed"));
    }
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-topbar">
        <button className="secondary-button" type="button" onClick={onBack}>
          Projects
        </button>
        <div>
          <p className="section-label">Workspace</p>
          <h1>{project.name}</h1>
        </div>
        <div className="workspace-status">{job ? formatWorkspaceStatus(job) : "DesignSpec idle"}</div>
      </header>

      <div className="workspace-grid">
        <ChatPanel
          job={job}
          isSubmitting={isSubmitting}
          isCancelling={isCancelling}
          error={error}
          onSubmitPrompt={submitPrompt}
          onCancelJob={cancelGeneration}
        />

        <CanvasWorkspace
          canvas={canvasDocument}
          status={canvasStatus}
          onCanvasChange={handleCanvasChange}
          onSelectNode={handleCanvasNodeSelect}
        />

        <PreviewPanel job={job} screenVersion={screenVersion} />
      </div>
    </main>
  );
}

type GenerationJobResponse = {
  job: GenerationJob;
  screenVersion?: ScreenVersion;
};

type ScreenVersionResponse = {
  screenVersion: ScreenVersion;
};

type ScreenResponse = {
  screen: {
    currentVersionId: string;
  };
};

type ProjectScreensResponse = {
  screens: Array<{
    screen: {
      id: string;
      currentVersionId: string;
    };
    currentVersion: {
      id: string;
    } | null;
  }>;
};

type CanvasResponse = {
  canvas: CanvasDocument;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

function createOptimisticJob(projectId: string, prompt: string): GenerationJob {
  const now = new Date().toISOString();

  return {
    id: "pending",
    projectId,
    type: "generate_screen",
    status: "queued",
    prompt,
    deviceType: "desktop",
    mode: "fast",
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function requestJson<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as TResponse & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Request failed with status ${response.status}`);
  }

  return payload;
}

async function fetchScreenVersion(screenVersionId: string): Promise<ScreenVersion> {
  const response = await requestJson<ScreenVersionResponse>(
    `/api/screen-versions/${screenVersionId}`,
  );
  return response.screenVersion;
}

async function fetchScreen(screenId: string): Promise<ScreenResponse> {
  return requestJson<ScreenResponse>(`/api/screens/${screenId}`);
}

function getErrorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function formatWorkspaceStatus(job: GenerationJob): string {
  switch (job.status) {
    case "queued":
      return "Generation queued";
    case "running":
      return "Generation running";
    case "completed":
      return "Generation complete";
    case "failed":
      return "Generation failed";
    case "cancelled":
      return "Generation cancelled";
  }
}

function formatCanvasStatus(canvas: CanvasDocument): string {
  if (canvas.nodes.length === 0) return "Empty";
  if (canvas.nodes.length === 1) return "1 node";
  return `${canvas.nodes.length} nodes`;
}
