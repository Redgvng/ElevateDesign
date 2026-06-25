import { createServer } from "node:http";
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
  }, 45_000);

  it("blocks external network requests made by generated HTML", async () => {
    let requestCount = 0;
    const server = createServer((_request, response) => {
      requestCount += 1;
      response.writeHead(200, { "content-type": "text/plain" });
      response.end("unexpected network access");
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind");

    try {
      const target = `http://127.0.0.1:${address.port}/private-resource`;
      const result = await renderHtmlScreenshot({
        html: `<!doctype html><html><body><h1>Isolated</h1><img src="${target}"><script>fetch("${target}").catch(() => undefined)</script></body></html>`,
        viewport: { width: 640, height: 480 },
      });

      expect(result.bytes.byteLength).toBeGreaterThan(500);
      expect(requestCount).toBe(0);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }, 45_000);
});
