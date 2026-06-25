import { useCallback, useEffect, useState } from "react";
import type { ScreenVersion, ScreenVersionSummary } from "@odc/shared";
import { artifactContentUrl } from "./PreviewPanel";

type VersionHistoryProps = {
  screenId: string | null;
  activeVersionId: string | null;
  onRevert: (version: ScreenVersion) => void;
};

type VersionsResponse = {
  versions: ScreenVersionSummary[];
};

type ScreenVersionResponse = {
  screenVersion: ScreenVersion;
};

export function VersionHistory({ screenId, activeVersionId, onRevert }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ScreenVersionSummary[]>([]);
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/screens/${id}/versions`);
      if (!response.ok) {
        setVersions([]);
        return;
      }
      const payload = (await response.json()) as VersionsResponse;
      setVersions(payload.versions ?? []);
    } catch {
      setVersions([]);
    }
  }, []);

  useEffect(() => {
    setCompareVersionId(null);
    if (!screenId) {
      setVersions([]);
      return;
    }
    void loadVersions(screenId);
  }, [screenId, activeVersionId, loadVersions]);

  async function revertTo(versionId: string) {
    if (!screenId || versionId === activeVersionId) return;

    setPendingVersionId(versionId);
    setError(null);
    try {
      const updateResponse = await fetch(`/api/screens/${screenId}/current-version`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenVersionId: versionId }),
      });
      if (!updateResponse.ok) {
        throw new Error("Could not restore this version.");
      }

      const versionResponse = await fetch(`/api/screen-versions/${versionId}`);
      if (!versionResponse.ok) {
        throw new Error("Could not load the restored version.");
      }
      const payload = (await versionResponse.json()) as ScreenVersionResponse;
      onRevert(payload.screenVersion);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not restore this version.");
    } finally {
      setPendingVersionId(null);
    }
  }

  if (!screenId || versions.length < 2) return null;

  const activeSummary = versions.find((version) => version.id === activeVersionId) ?? null;
  const compareSummary = compareVersionId
    ? versions.find((version) => version.id === compareVersionId) ?? null
    : null;
  const comparison =
    activeSummary && compareSummary && compareSummary.screenshotArtifactId
      ? { left: activeSummary, right: compareSummary }
      : null;

  return (
    <section className="version-history" aria-label="Version history">
      <div className="panel-header">
        <h2>Versions</h2>
        <span>{versions.length} versions</span>
      </div>

      <ul className="version-list">
        {versions.map((version) => {
          const isActive = version.id === activeVersionId;
          return (
            <li key={version.id} className={isActive ? "version-item active" : "version-item"}>
              <span className="version-label">
                v{version.versionNumber} · {version.operation}
              </span>
              {isActive ? (
                <span className="version-current">Current</span>
              ) : (
                <div className="version-actions">
                  {version.screenshotArtifactId ? (
                    <button
                      type="button"
                      className="secondary-button"
                      aria-pressed={compareVersionId === version.id}
                      onClick={() =>
                        setCompareVersionId((current) =>
                          current === version.id ? null : version.id,
                        )
                      }
                    >
                      {compareVersionId === version.id ? "Hide compare" : "Compare"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={pendingVersionId !== null}
                    onClick={() => void revertTo(version.id)}
                  >
                    {pendingVersionId === version.id ? "Restoring…" : "Restore"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {comparison ? (
        <div className="version-compare" aria-label="Version comparison">
          <figure>
            <figcaption>v{comparison.left.versionNumber} (current)</figcaption>
            {comparison.left.screenshotArtifactId ? (
              <img
                src={artifactContentUrl(comparison.left.screenshotArtifactId)}
                alt={`Version ${comparison.left.versionNumber} screenshot`}
              />
            ) : (
              <p className="version-compare-empty">No screenshot</p>
            )}
          </figure>
          <figure>
            <figcaption>v{comparison.right.versionNumber}</figcaption>
            <img
              src={artifactContentUrl(comparison.right.screenshotArtifactId as string)}
              alt={`Version ${comparison.right.versionNumber} screenshot`}
            />
          </figure>
        </div>
      ) : null}

      {error ? <p className="version-error">{error}</p> : null}
    </section>
  );
}
