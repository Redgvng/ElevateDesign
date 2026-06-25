import { chromium, type BrowserContext, type Route } from "playwright";

export type RenderHtmlScreenshotInput = {
  html: string;
  viewport: {
    width: number;
    height: number;
  };
};

export type RenderHtmlScreenshotOutput = {
  bytes: Buffer;
  mimeType: "image/png";
  width: number;
  height: number;
};

export async function renderHtmlScreenshot(
  input: RenderHtmlScreenshotInput,
): Promise<RenderHtmlScreenshotOutput> {
  const browser = await chromium.launch({
    args: [
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-sync",
      "--metrics-recording-only",
      "--no-first-run",
    ],
  });
  let context: BrowserContext | null = null;

  try {
    context = await browser.newContext({
      viewport: input.viewport,
      acceptDownloads: false,
      serviceWorkers: "block",
    });
    await context.route("**/*", blockExternalRequest);

    const page = await context.newPage();
    await page.routeWebSocket("**/*", (webSocket) => webSocket.close());
    page.on("popup", (popup) => void popup.close());

    await page.setContent(input.html, { waitUntil: "load", timeout: 5_000 });
    const bytes = await page.locator("body").screenshot({
      animations: "disabled",
      timeout: 5_000,
      type: "png",
    });

    return {
      bytes,
      mimeType: "image/png",
      width: input.viewport.width,
      height: input.viewport.height,
    };
  } finally {
    await context?.close().catch(() => undefined);
    await browser.close();
  }
}

async function blockExternalRequest(route: Route): Promise<void> {
  const url = route.request().url();
  if (isEmbeddedResource(url)) {
    await route.continue();
    return;
  }

  await route.abort("blockedbyclient");
}

function isEmbeddedResource(url: string): boolean {
  return url === "about:blank" || url.startsWith("data:") || url.startsWith("blob:");
}
