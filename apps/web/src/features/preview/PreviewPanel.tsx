import { useEffect, useState } from "react";
import type { GenerationJob, ScreenVersion } from "@odc/shared";
import { designSpecToReact, reactDownloadName } from "../../lib/designSpecToReact";
import { buildViteProjectZip, viteProjectZipName } from "../../lib/viteProjectExport";

type PreviewPanelProps = {
  job: GenerationJob | null;
  screenVersion: ScreenVersion | null;
  projectId: string;
};

type PreviewMode = "html" | "snapshot";

export function PreviewPanel({ job, screenVersion, projectId }: PreviewPanelProps) {
  const [mode, setMode] = useState<PreviewMode>("html");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const screenshotArtifactId = screenVersion?.screenshotArtifactId ?? null;

  useEffect(() => {
    setMode("html");
    setShareUrl(null);
  }, [screenVersion?.id]);

  async function shareVersion(versionId: string) {
    setIsSharing(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/screen-versions/${versionId}/share`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("share failed");
      const { shareLink } = (await response.json()) as { shareLink: { url: string } };
      const absolute = new URL(shareLink.url, window.location.origin).toString();
      setShareUrl(absolute);
      await navigator.clipboard?.writeText(absolute).catch(() => undefined);
    } catch {
      setShareUrl(null);
    } finally {
      setIsSharing(false);
    }
  }

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
              <button
                type="button"
                className="preview-export-button"
                onClick={() => {
                  void buildViteProjectZip(screenVersion.designSpec).then((blob) =>
                    downloadBlob(viteProjectZipName(screenVersion.designSpec.title), blob),
                  );
                }}
              >
                Export project
              </button>
              <button
                type="button"
                className="preview-export-button"
                disabled={isSharing}
                onClick={() => void shareVersion(screenVersion.id)}
              >
                {isSharing ? "Sharing…" : "Share"}
              </button>
            </div>
          ) : null}
        </div>

        {shareUrl ? (
          <div className="preview-share-bar">
            <span>Public link (copied):</span>
            <a href={shareUrl} target="_blank" rel="noreferrer noopener">
              {shareUrl}
            </a>
          </div>
        ) : null}

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
  downloadBlob(filename, new Blob([content], { type: mimeType }));
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
