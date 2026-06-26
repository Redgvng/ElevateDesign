import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createGenerationResultPersister,
  type ArtifactObjectStore,
  type GenerationRepositories,
  type GenerationUnitOfWork,
} from "@odc/db";
import { loadConfig, type AppConfig } from "./config";
import {
  createInMemoryGenerationJobRepository,
  createQueuedGenerationStore,
  type GenerationQueue,
} from "./lib/generation-store";
import { createConfiguredArtifactObjectStore } from "./lib/artifact-object-store";
import { createInMemoryDesignSystemStore, type DesignSystemStore } from "./lib/design-system-store";
import { createPgDesignSystemStore } from "./lib/pg-design-system-store";
import { createConfiguredGenerationQueue } from "./lib/generation-queue";
import { createHttpEveGenerationDispatcher } from "./lib/eve-dispatch";
import { createInMemoryShareLinkStore, type ShareLinkStore } from "./lib/share-link-store";
import { createPgShareLinkStore } from "./lib/pg-share-link-store";
import { createPgGenerationRepositories } from "./lib/pg-generation-repositories";
import { createPgProjectStore } from "./lib/pg-project-store";
import { createInMemoryProjectStore } from "./lib/project-store";
import { checkReadiness } from "./lib/readiness";
import { createArtifactsRouter } from "./routes/artifacts";
import { createAuthoredScreenVersionsRouter } from "./routes/authored-screen-versions";
import { createCanvasRouter } from "./routes/canvas";
import { createDesignSystemsRouter } from "./routes/design-systems";
import { createSharingRouter } from "./routes/sharing";
import { createGenerationJobsRouter } from "./routes/generation-jobs";
import { createProjectsRouter } from "./routes/projects";
import { createScreensRouter } from "./routes/screens";

export type CreateAppOptions = {
  config?: AppConfig;
  generationQueue?: GenerationQueue;
  generationRepositories?: GenerationRepositories;
  artifactObjectStore?: ArtifactObjectStore | null;
  designSystemStore?: DesignSystemStore;
  shareLinkStore?: ShareLinkStore;
};

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const store = config.databaseUrl
    ? createPgProjectStore(config.databaseUrl, {
        workspaceId: config.defaultWorkspace.id,
        workspaceName: config.defaultWorkspace.name,
        workspaceSlug: config.defaultWorkspace.slug,
      })
    : createInMemoryProjectStore();
  const generationRepositories =
    options.generationRepositories ??
    (config.databaseUrl
      ? createPgGenerationRepositories(config.databaseUrl)
      : createEmptyInMemoryGenerationRepositories());
  const artifactObjectStore =
    options.artifactObjectStore === undefined
      ? createConfiguredArtifactObjectStore(config)
      : options.artifactObjectStore;
  const designSystemStore =
    options.designSystemStore ??
    (config.databaseUrl
      ? createPgDesignSystemStore(config.databaseUrl)
      : createInMemoryDesignSystemStore());
  const shareLinkStore =
    options.shareLinkStore ??
    (config.databaseUrl
      ? createPgShareLinkStore(config.databaseUrl)
      : createInMemoryShareLinkStore());
  const eveDispatcher =
    config.eveGeneration.enabled && config.eveGeneration.dispatchUrl
      ? createHttpEveGenerationDispatcher(config.eveGeneration.dispatchUrl)
      : undefined;
  const generationStore = createQueuedGenerationStore({
    projectStore: store,
    generationJobs: generationRepositories.generationJobs,
    queue: options.generationQueue ?? createConfiguredGenerationQueue(config.redisUrl),
    designSystemStore,
    eveDispatcher,
  });
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: config.corsOrigins,
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
      allowHeaders: ["content-type", "idempotency-key"],
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/health/live", (c) => c.json({ ok: true }));
  app.get("/health/ready", async (c) => {
    const report = await checkReadiness(config);
    return c.json(report, report.ok ? 200 : 503);
  });
  app.route("/api/projects", createProjectsRouter(store));
  app.route("/api/projects", createCanvasRouter(store));
  app.route("/", createDesignSystemsRouter(store, designSystemStore));
  app.route("/", createSharingRouter(store, generationRepositories, shareLinkStore));
  const unitOfWork: GenerationUnitOfWork =
    "unitOfWork" in generationRepositories
      ? (generationRepositories as { unitOfWork: GenerationUnitOfWork }).unitOfWork
      : { transaction: (callback) => callback(generationRepositories) };

  app.route("/", createGenerationJobsRouter(generationStore));
  app.route("/", createScreensRouter(store, generationRepositories));
  app.route(
    "/",
    createAuthoredScreenVersionsRouter(store, createGenerationResultPersister(unitOfWork)),
  );
  app.route(
    "/",
    createArtifactsRouter(store, generationRepositories.artifacts, artifactObjectStore),
  );

  return app;
}

function createEmptyInMemoryGenerationRepositories(): GenerationRepositories {
  return {
    generationJobs: createInMemoryGenerationJobRepository(),
    screens: {
      create: async () => {
        throw new Error("Screen creation is not supported by the in-memory generation store");
      },
      findById: async () => null,
      listByProject: async () => [],
      setCurrentVersion: async () => {
        throw new Error("Screen updates are not supported by the in-memory generation store");
      },
    },
    screenVersions: {
      create: async () => {
        throw new Error("Screen version creation is not supported by the in-memory generation store");
      },
      findById: async () => null,
      listByScreen: async () => [],
    },
    artifacts: {
      create: async () => {
        throw new Error("Artifact creation is not supported by the in-memory generation store");
      },
      findById: async () => null,
      listByScreenVersion: async () => [],
    },
  };
}
