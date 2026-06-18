import { expect, test } from "@playwright/test";

test("creates a project and opens the workspace shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await page.getByLabel("Project name").fill("MVP Dashboard");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("heading", { name: "MVP Dashboard" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Chat" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Canvas" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Preview" })).toBeVisible();
});

test("generates a screen and renders the HTML preview in a sandboxed iframe", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Project name").fill("Generated Dashboard");
  await page.getByRole("button", { name: "Create project" }).click();

  await page.getByLabel("Prompt").fill("Create a dense SaaS monitoring dashboard");
  await page.getByRole("button", { name: "Generate screen" }).click();

  await expect(page.getByText("Job completed").first()).toBeVisible();

  const preview = page.getByTitle("Generated screen preview");
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("sandbox", "");

  await expect(
    page.frameLocator('iframe[title="Generated screen preview"]').getByRole("heading"),
  ).toContainText(/Generated Dashboard|Operations Dashboard|SaaS Dashboard/);
});

test("generates a canvas node, moves it, and keeps its position after reload", async ({ page }) => {
  const projectName = `Movable Canvas ${Date.now()}`;

  await page.goto("/");
  await page.getByLabel("Project name").fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();

  await page.getByLabel("Prompt").fill("Create a dense SaaS monitoring dashboard");
  await page.getByRole("button", { name: "Generate screen" }).click();
  await expect(page.getByText("Job completed").first()).toBeVisible();
  await expect(page.getByText("1 node")).toBeVisible();

  const project = await findProjectByName(page, projectName);
  const initialCanvas = await getCanvas(page, project.id);
  expect(initialCanvas.nodes).toHaveLength(1);
  expect(initialCanvas.nodes[0].x).toBe(80);
  expect(initialCanvas.nodes[0].y).toBe(80);

  const canvasPanel = page.getByRole("region", { name: "Canvas" });
  const box = await canvasPanel.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/projects/${project.id}/canvas`) &&
      response.request().method() === "PUT",
  );
  await page.mouse.move(box.x + 215, box.y + 220);
  await page.mouse.down();
  await page.mouse.move(box.x + 335, box.y + 300, { steps: 8 });
  await page.mouse.up();
  await saveResponse;

  const movedCanvas = await getCanvas(page, project.id);
  expect(movedCanvas.nodes[0].x).not.toBe(initialCanvas.nodes[0].x);
  expect(movedCanvas.nodes[0].y).not.toBe(initialCanvas.nodes[0].y);

  await page.reload();
  await page.getByRole("button", { name: projectName }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByText("1 node")).toBeVisible();

  const reloadedCanvas = await getCanvas(page, project.id);
  expect(reloadedCanvas.nodes[0].x).toBe(movedCanvas.nodes[0].x);
  expect(reloadedCanvas.nodes[0].y).toBe(movedCanvas.nodes[0].y);
});

async function findProjectByName(page: import("@playwright/test").Page, name: string) {
  const response = await page.request.get("/api/projects");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  const project = body.projects.find((candidate: { name: string }) => candidate.name === name);
  expect(project).toBeTruthy();
  return project as { id: string; name: string };
}

async function getCanvas(page: import("@playwright/test").Page, projectId: string) {
  const response = await page.request.get(`/api/projects/${projectId}/canvas`);
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.canvas as { nodes: Array<{ x: number; y: number }> };
}
