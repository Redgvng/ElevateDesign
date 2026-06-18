import type { GenerationJob, ScreenVersion } from "@odc/shared";

type PreviewPanelProps = {
  job: GenerationJob | null;
  screenVersion: ScreenVersion | null;
};

export function PreviewPanel({ job, screenVersion }: PreviewPanelProps) {
  return (
    <section className="workspace-panel preview-panel" aria-label="Preview">
      <div className="panel-header">
        <h2>Preview</h2>
        <span>{screenVersion ? `Version ${screenVersion.versionNumber}` : "Sandbox"}</span>
      </div>

      <div className="preview-frame-shell">
        <div className="browser-bar" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        {screenVersion ? (
          <iframe
            className="preview-iframe"
            title="Generated screen preview"
            sandbox=""
            srcDoc={screenVersion.htmlCode}
          />
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
