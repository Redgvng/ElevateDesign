import { describe, expect, it } from "vitest";
import { renderHtmlScreenshot } from "./renderHtmlScreenshot";

describe("renderHtmlScreenshot", () => {
  it("renders HTML into a PNG screenshot buffer", async () => {
    const result = await renderHtmlScreenshot({
      html: "<!doctype html><html><body><h1>Screenshot Target</h1></body></html>",
      viewport: { width: 640, height: 480 },
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.bytes.byteLength).toBeGreaterThan(500);
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
  }, 15_000);
});
