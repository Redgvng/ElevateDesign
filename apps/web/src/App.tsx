import { useEffect, useState } from "react";
import type { Project } from "@odc/shared";
import { ProjectsPage } from "./features/projects/ProjectsPage";
import { Workspace } from "./features/workspace/Workspace";

type ProjectsResponse = {
  projects: Project[];
};

type ProjectResponse = {
  project: Project;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      setIsLoadingProjects(true);
      setError(null);

      try {
        const data = await requestJson<ProjectsResponse>("/api/projects");
        if (isMounted) {
          setProjects(data.projects);
        }
      } catch (caught) {
        if (isMounted) {
          setError(getErrorMessage(caught, "Could not load projects."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingProjects(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  async function createProject(name: string) {
    setIsCreatingProject(true);
    setError(null);

    try {
      const data = await requestJson<ProjectResponse>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setProjects((currentProjects) => [data.project, ...currentProjects]);
      setSelectedProject(data.project);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not create project."));
    } finally {
      setIsCreatingProject(false);
    }
  }

  if (selectedProject) {
    return <Workspace project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  return (
    <ProjectsPage
      projects={projects}
      isLoading={isLoadingProjects}
      isCreating={isCreatingProject}
      error={error}
      onCreateProject={createProject}
      onSelectProject={setSelectedProject}
    />
  );
}

async function requestJson<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as TResponse & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Request failed with status ${response.status}`);
  }

  return payload;
}

function getErrorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
