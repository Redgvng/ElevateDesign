import { chromium } from "playwright";

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
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: input.viewport });
    await page.setContent(input.html, { waitUntil: "networkidle", timeout: 5_000 });
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
    await browser.close();
  }
}
