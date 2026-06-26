import type { ScreenVersion } from "@odc/shared";
import { designSpecToFigmaPlan } from "./figma-plan";

const form = document.getElementById("import-form") as HTMLFormElement;
const statusEl = document.getElementById("status") as HTMLElement;

async function fetchScreenshotBytes(baseUrl: string, artifactId: string): Promise<Uint8Array> {
  const response = await fetch(`${baseUrl}/api/artifacts/${encodeURIComponent(artifactId)}/content`);
  if (!response.ok) return new Uint8Array();
  return new Uint8Array(await response.arrayBuffer());
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const baseUrl = String(data.get("baseUrl") ?? "").replace(/\/+$/, "");
  const screenVersionId = String(data.get("screenVersionId") ?? "").trim();
  if (!baseUrl || !screenVersionId) return;

  statusEl.textContent = "Loading…";
  try {
    const response = await fetch(`${baseUrl}/api/screen-versions/${screenVersionId}`);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const { screenVersion } = (await response.json()) as { screenVersion: ScreenVersion };

    const plan = designSpecToFigmaPlan(screenVersion.designSpec);
    const screenshot = screenVersion.screenshotArtifactId
      ? await fetchScreenshotBytes(baseUrl, screenVersion.screenshotArtifactId)
      : undefined;

    parent.postMessage(
      { pluginMessage: { type: "import-screen", plan, screenshot } },
      "*",
    );
    statusEl.textContent = `Imported "${plan.title}".`;
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : "Import failed.";
  }
});
