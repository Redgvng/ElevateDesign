import { useCallback, useEffect, useState } from "react";
import { DEFAULT_DESIGN_SYSTEM, type DesignSystem } from "@odc/shared";

type DesignSystemPanelProps = {
  projectId: string;
};

type DesignSystemsResponse = {
  designSystems: DesignSystem[];
};

export function DesignSystemPanel({ projectId }: DesignSystemPanelProps) {
  const [systems, setSystems] = useState<DesignSystem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/design-systems`);
      if (!response.ok) return;
      const payload = (await response.json()) as DesignSystemsResponse;
      setSystems(payload.designSystems ?? []);
    } catch {
      setSystems([]);
    }
  }, [projectId]);

  useEffect(() => {
    setSelectedId(null);
    void load();
  }, [load]);

  const selected = systems.find((system) => system.id === selectedId) ?? null;

  function selectSystem(system: DesignSystem) {
    setSelectedId(system.id);
    setMarkdown(system.designMarkdown);
    setError(null);
  }

  async function createFromDefault() {
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/design-systems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Design system ${systems.length + 1}`,
          description: DEFAULT_DESIGN_SYSTEM.description,
          tokens: DEFAULT_DESIGN_SYSTEM.tokens,
          designMarkdown: DEFAULT_DESIGN_SYSTEM.designMarkdown,
        }),
      });
      if (!response.ok) throw new Error("Could not create design system.");
      const { designSystem } = (await response.json()) as { designSystem: DesignSystem };
      await load();
      selectSystem(designSystem);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create design system.");
    }
  }

  async function save() {
    if (!selected) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/design-systems/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          description: selected.description,
          tokens: selected.tokens,
          designMarkdown: markdown,
        }),
      });
      if (!response.ok) throw new Error("Could not save design system.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save design system.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="design-system-panel" aria-label="Design system">
      <div className="panel-header">
        <h2>Design system</h2>
        <button type="button" className="secondary-button" onClick={() => void createFromDefault()}>
          Add
        </button>
      </div>

      {systems.length === 0 ? (
        <p className="design-system-empty">No design system yet. Add one to keep screens consistent.</p>
      ) : (
        <ul className="design-system-list">
          {systems.map((system) => (
            <li key={system.id}>
              <button
                type="button"
                className={system.id === selectedId ? "ds-item active" : "ds-item"}
                onClick={() => selectSystem(system)}
              >
                {system.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="design-system-editor">
          <label htmlFor={`ds-md-${selected.id}`}>DESIGN.md guidance</label>
          <textarea
            id={`ds-md-${selected.id}`}
            rows={4}
            value={markdown}
            onChange={(event) => setMarkdown(event.currentTarget.value)}
          />
          <button type="button" disabled={isSaving} onClick={() => void save()}>
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      ) : null}

      {error ? <p className="design-system-error">{error}</p> : null}
    </section>
  );
}
