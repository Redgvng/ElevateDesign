import { useEffect, useState } from "react";
import type { GenerationJob, ScreenVersion } from "@odc/shared";
import { designSpecToReact, reactDownloadName } from "../../lib/designSpecToReact";

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

          {screenVersion ? (
            <div className="preview-export-actions">
              <button
                type="button"
                className="preview-export-button"
                onClick={() =>
                  downloadTextFile(
                    htmlDownloadName(screenVersion.designSpec.title),
                    screenVersion.htmlCode,
                    "text/html",
                  )
                }
              >
                Export HTML
              </button>
              <button
                type="button"
                className="preview-export-button"
                onClick={() =>
                  downloadTextFile(
                    reactDownloadName(screenVersion.designSpec.title),
                    designSpecToReact(screenVersion.designSpec),
                    "text/plain",
                  )
                }
              >
                Export React
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

export function htmlDownloadName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "screen"}.html`;
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
