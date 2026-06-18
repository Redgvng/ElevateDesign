import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig, type AppConfig } from "./config";
import {
  createInMemoryGenerationStore,
  type ScreenshotRenderer,
} from "./lib/generation-store";
import { createPgProjectStore } from "./lib/pg-project-store";
import { createInMemoryProjectStore } from "./lib/project-store";
import { checkReadiness } from "./lib/readiness";
import { createCanvasRouter } from "./routes/canvas";
import { createGenerationJobsRouter } from "./routes/generation-jobs";
import { createProjectsRouter } from "./routes/projects";

export type CreateAppOptions = {
  config?: AppConfig;
  renderScreenshot?: ScreenshotRenderer;
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
  const generationStore = createInMemoryGenerationStore(store, {
    renderScreenshot: options.renderScreenshot,
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
  app.route("/", createGenerationJobsRouter(generationStore));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  serve({ fetch: createApp({ config }).fetch, port: config.port });
  console.log(`Open Design Canvas API listening on http://localhost:${config.port}`);
}
