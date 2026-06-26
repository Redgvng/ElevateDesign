import type { OdcApiClient } from "./odc-api-client";

export type ExportFormat = "html" | "react" | "vite-zip";

export type PrepareExportResult = {
  screenVersionId: string;
  title: string;
  artifacts: Array<{ format: ExportFormat; filename: string }>;
  summary: string;
};

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "screen"
  );
}

function filenameFor(format: ExportFormat, title: string): string {
  const base = slug(title);
  if (format === "html") return `${base}.html`;
  if (format === "react") return `${base}.tsx`;
  return `${base}-vite.zip`;
}

/**
 * Planning/export-prep tool: resolves the target version and returns the export
 * plan (formats + filenames). It does NOT produce download artifacts — those
 * stay in the backend/web export flow — so it needs no approval gate.
 */
export async function prepareExport(
  client: OdcApiClient,
  screenVersionId: string,
  formats: ExportFormat[] = ["html", "react", "vite-zip"],
): Promise<PrepareExportResult> {
  const version = await client.getScreenVersion(screenVersionId);
  const title = version.designSpec.title;
  const artifacts = formats.map((format) => ({ format, filename: filenameFor(format, title) }));

  return {
    screenVersionId,
    title,
    artifacts,
    summary: `export plan for "${title}" v${version.versionNumber}: ${artifacts
      .map((a) => a.filename)
      .join(", ")}`,
  };
}
