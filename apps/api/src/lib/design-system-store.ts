import { randomUUID } from "node:crypto";
import type { DesignSystem, DesignTokens } from "@odc/shared";

export type DesignSystemInput = {
  name: string;
  description: string;
  tokens: DesignTokens;
  designMarkdown: string;
};

export type DesignSystemStore = {
  listByProject(projectId: string): Promise<DesignSystem[]>;
  getById(projectId: string, designSystemId: string): Promise<DesignSystem | null>;
  create(projectId: string, input: DesignSystemInput): Promise<DesignSystem>;
  update(
    projectId: string,
    designSystemId: string,
    input: DesignSystemInput,
  ): Promise<DesignSystem | null>;
};

type StoredDesignSystem = DesignSystem & { projectId: string; updatedAt: string };

export function createInMemoryDesignSystemStore(): DesignSystemStore {
  const systems = new Map<string, StoredDesignSystem>();

  function toDesignSystem(stored: StoredDesignSystem): DesignSystem {
    const { projectId: _projectId, updatedAt: _updatedAt, ...system } = stored;
    return system;
  }

  return {
    async listByProject(projectId) {
      return [...systems.values()]
        .filter((system) => system.projectId === projectId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map(toDesignSystem);
    },

    async getById(projectId, designSystemId) {
      const stored = systems.get(designSystemId);
      return stored && stored.projectId === projectId ? toDesignSystem(stored) : null;
    },

    async create(projectId, input) {
      const stored: StoredDesignSystem = {
        id: `ds_${randomUUID()}`,
        projectId,
        name: input.name,
        description: input.description,
        tokens: input.tokens,
        designMarkdown: input.designMarkdown,
        updatedAt: new Date().toISOString(),
      };
      systems.set(stored.id, stored);
      return toDesignSystem(stored);
    },

    async update(projectId, designSystemId, input) {
      const stored = systems.get(designSystemId);
      if (!stored || stored.projectId !== projectId) return null;

      const updated: StoredDesignSystem = {
        ...stored,
        name: input.name,
        description: input.description,
        tokens: input.tokens,
        designMarkdown: input.designMarkdown,
        updatedAt: new Date().toISOString(),
      };
      systems.set(designSystemId, updated);
      return toDesignSystem(updated);
    },
  };
}
