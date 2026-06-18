import { FormEvent, useState } from "react";
import type { Project } from "@odc/shared";

type ProjectsPageProps = {
  projects: Project[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  onCreateProject: (name: string) => Promise<void>;
  onSelectProject: (project: Project) => void;
};

export function ProjectsPage({
  projects,
  isLoading,
  isCreating,
  error,
  onCreateProject,
  onSelectProject,
}: ProjectsPageProps) {
  const [projectName, setProjectName] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = projectName.trim();
    if (!trimmedName || isCreating) {
      return;
    }

    await onCreateProject(trimmedName);
    setProjectName("");
  }

  return (
    <main className="project-shell">
      <section className="project-panel" aria-labelledby="projects-heading">
        <div className="project-header">
          <div>
            <p className="section-label">Open Design Canvas</p>
            <h1 id="projects-heading">Projects</h1>
          </div>
          <div className="project-count">{projects.length} projects</div>
        </div>

        <form className="create-project-form" onSubmit={handleSubmit}>
          <label htmlFor="project-name">Project name</label>
          <div className="create-project-row">
            <input
              id="project-name"
              name="project-name"
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.currentTarget.value)}
              placeholder="Client dashboard exploration"
              disabled={isCreating}
            />
            <button type="submit" disabled={isCreating || !projectName.trim()}>
              {isCreating ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="project-list" aria-live="polite">
          {isLoading ? <div className="empty-state">Loading projects...</div> : null}

          {!isLoading && projects.length === 0 ? (
            <div className="empty-state">
              <strong>No projects yet</strong>
              <span>Create one to open the editor workspace.</span>
            </div>
          ) : null}

          {!isLoading
            ? projects.map((project) => (
                <button
                  className="project-list-item"
                  type="button"
                  key={project.id}
                  aria-label={project.name}
                  onClick={() => onSelectProject(project)}
                >
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.slug}</small>
                  </span>
                  <span className="project-open">Open</span>
                </button>
              ))
            : null}
        </div>
      </section>
    </main>
  );
}
