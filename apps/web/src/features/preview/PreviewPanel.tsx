import { useEffect, useState } from "react";
import type { GenerationJob, ScreenVersion } from "@odc/shared";

type PreviewPanelProps = {
  job: GenerationJob | null;
  screenVersion: ScreenVersion | null;
};

type PreviewMode = "html" | "snapshot";

export function PreviewPanel({ job, screenVersion }: PreviewPanelProps) {
  const [mode, setMode] = useState<PreviewMode>("html");
  const screenshotArtifactId = screenVersion?.screenshotArtifactId ?? null;

  useEffect(() => {
    setMode("html");
  }, [screenVersion?.id]);

  return (
    <section className="workspace-panel preview-panel" aria-label="Preview">
      <div className="panel-header">
        <h2>Preview</h2>
        <span>{screenVersion ? `Version ${screenVersion.versionNumber}` : "Sandbox"}</span>
      </div>

      <div className="preview-frame-shell">
        <div className="browser-bar">
          <div className="browser-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          {screenVersion && screenshotArtifactId ? (
            <div className="preview-mode-switch" aria-label="Preview mode">
              <button
                type="button"
                aria-pressed={mode === "html"}
                onClick={() => setMode("html")}
              >
                Live HTML
              </button>
              <button
                type="button"
                aria-pressed={mode === "snapshot"}
                onClick={() => setMode("snapshot")}
              >
                Snapshot
              </button>
            </div>
          ) : null}
        </div>

        {screenVersion ? (
          mode === "snapshot" && screenshotArtifactId ? (
            <div className="preview-snapshot-shell">
              <img
                className="preview-snapshot"
                src={artifactContentUrl(screenshotArtifactId)}
                alt={`${screenVersion.designSpec.title} generated screenshot`}
              />
            </div>
          ) : (
            <iframe
              className="preview-iframe"
              title="Generated screen preview"
              sandbox=""
              srcDoc={screenVersion.htmlCode}
            />
          )
        ) : (
          <div className="preview-empty">
            {job?.status === "queued" || job?.status === "running"
              ? "Waiting for generated HTML..."
              : "Generated HTML preview will render here in an isolated surface."}
          </div>
        )}
      </div>
    </section>
  );
}

export function artifactContentUrl(artifactId: string): string {
  return `/api/artifacts/${encodeURIComponent(artifactId)}/content`;
}
