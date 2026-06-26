import type { OdcApiClient } from "../lib/odc-api-client";

export type ProjectContextView = {
  projectId: string;
  projectName: string;
  screens: Array<{ screenId: string; title: string; currentVersionNumber: number | null }>;
  designSystems: Array<{ id: string; name: string }>;
  summary: string;
};

/**
 * Read-only project context for the agent. Redacts everything the model does
 * not need (full DesignSpecs, HTML, tokens, internal ids) and returns a bounded
 * view plus a one-line summary.
 */
export async function getProjectContext(
  client: OdcApiClient,
  projectId: string,
): Promise<ProjectContextView> {
  const context = await client.getProjectContext(projectId);

  const screens = context.screens.map((entry) => ({
    screenId: entry.screen.id,
    title: entry.screen.title,
    currentVersionNumber: entry.currentVersion?.versionNumber ?? null,
  }));
  const designSystems = context.designSystems.map((system) => ({
    id: system.id,
    name: system.name,
  }));

  const summary =
    `project="${context.project.name}" screens=${screens.length} ` +
    `designSystems=${designSystems.length}`;

  return {
    projectId: context.project.id,
    projectName: context.project.name,
    screens,
    designSystems,
    summary,
  };
}
