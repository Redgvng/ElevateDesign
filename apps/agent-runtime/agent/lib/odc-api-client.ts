import type {
  CreateGenerationJobInput,
  DesignSpec,
  DesignSystem,
  GenerationJob,
  Project,
  Screen,
  ScreenVersion,
  ScreenVersionSummary,
} from "@odc/shared";

export type AuthoredScreenVersionInput = {
  designSpec: DesignSpec;
  sourcePrompt: string;
  baseScreenId?: string;
  baseVersionId?: string;
};

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type OdcApiClientOptions = {
  baseUrl: string;
  fetch?: FetchLike;
};

export class OdcApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OdcApiError";
  }
}

export type ProjectContext = {
  project: Project;
  screens: Array<{ screen: Screen; currentVersion: ScreenVersionSummary | null }>;
  designSystems: DesignSystem[];
};

/**
 * The single, typed bridge from Eve tools to the product backend. Eve never
 * talks to Postgres/Redis directly — every read and write goes through here so
 * the backend keeps ownership of projects, jobs, screens, versions and auth.
 */
export function createOdcApiClient({ baseUrl, fetch = globalThis.fetch as FetchLike }: OdcApiClientOptions) {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    path: string,
    init?: { method?: string; body?: unknown; idempotencyKey?: string },
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (init?.body !== undefined) headers["content-type"] = "application/json";
    if (init?.idempotencyKey) headers["idempotency-key"] = init.idempotencyKey;

    const response = await fetch(`${root}${path}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as T & {
      error?: { code?: string; message?: string };
    };
    if (!response.ok) {
      throw new OdcApiError(
        response.status,
        payload.error?.code ?? "REQUEST_FAILED",
        payload.error?.message ?? `Request failed with status ${response.status}`,
      );
    }
    return payload;
  }

  return {
    async getProjectContext(projectId: string): Promise<ProjectContext> {
      const [{ project }, screensResponse, designSystemsResponse] = await Promise.all([
        request<{ project: Project }>(`/api/projects/${projectId}`),
        request<{ screens: ProjectContext["screens"] }>(`/api/projects/${projectId}/screens`),
        request<{ designSystems: DesignSystem[] }>(`/api/projects/${projectId}/design-systems`),
      ]);
      return {
        project,
        screens: screensResponse.screens,
        designSystems: designSystemsResponse.designSystems,
      };
    },

    async createGenerationJob(
      projectId: string,
      input: CreateGenerationJobInput,
      idempotencyKey?: string,
    ): Promise<GenerationJob> {
      const { job } = await request<{ job: GenerationJob }>(
        `/api/projects/${projectId}/generation-jobs`,
        { method: "POST", body: input, idempotencyKey },
      );
      return job;
    },

    async getGenerationJob(jobId: string): Promise<GenerationJob> {
      const { job } = await request<{ job: GenerationJob }>(`/api/generation-jobs/${jobId}`);
      return job;
    },

    async getScreenVersion(screenVersionId: string): Promise<ScreenVersion> {
      const { screenVersion } = await request<{ screenVersion: ScreenVersion }>(
        `/api/screen-versions/${screenVersionId}`,
      );
      return screenVersion;
    },

    async createScreenVersion(
      projectId: string,
      input: AuthoredScreenVersionInput,
      idempotencyKey?: string,
    ): Promise<{ screen: Screen; screenVersion: ScreenVersion }> {
      return request<{ screen: Screen; screenVersion: ScreenVersion }>(
        `/api/projects/${projectId}/screen-versions`,
        { method: "POST", body: input, idempotencyKey },
      );
    },
  };
}

export type OdcApiClient = ReturnType<typeof createOdcApiClient>;
