import { describe, expect, it, vi } from "vitest";
import { ObjectStorageNotFoundError, createS3ObjectStore } from "./object-store";

const config = {
  endpoint: "http://127.0.0.1:9000",
  region: "us-east-1",
  bucket: "odc-artifacts",
  accessKey: "odc_minio",
  secretKey: "odc_minio_password",
  forcePathStyle: true,
};

const fixedNow = () => new Date("2026-06-18T10:00:00.000Z");

describe("createS3ObjectStore", () => {
  it("uploads bytes to a path-style endpoint with AWS Signature V4", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const store = createS3ObjectStore(config, { fetch: fetchMock, now: fixedNow });

    await store.putObject({
      key: "generation-jobs/job 1/screenshot.png",
      bytes: Buffer.from("png-bytes"),
      contentType: "image/png",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://127.0.0.1:9000/odc-artifacts/generation-jobs/job%201/screenshot.png",
    );
    expect(init?.method).toBe("PUT");
    expect(new Headers(init?.headers).get("authorization")).toContain(
      "Credential=odc_minio/20260618/us-east-1/s3/aws4_request",
    );
  });

  it("streams an object and preserves storage metadata", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(Buffer.from("png-bytes"), {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": "9",
          etag: '"storage-etag"',
          "last-modified": "Thu, 18 Jun 2026 10:00:00 GMT",
        },
      }),
    );
    const store = createS3ObjectStore(config, { fetch: fetchMock, now: fixedNow });

    const object = await store.getObject("generation-jobs/job_1/screenshot.png");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://127.0.0.1:9000/odc-artifacts/generation-jobs/job_1/screenshot.png",
    );
    expect(init?.method).toBe("GET");
    expect(object).toMatchObject({
      contentType: "image/png",
      contentLength: 9,
      etag: '"storage-etag"',
      lastModified: "Thu, 18 Jun 2026 10:00:00 GMT",
    });
    expect(Buffer.from(await new Response(object.body).arrayBuffer()).toString()).toBe("png-bytes");
  });

  it("maps a missing GET object to a typed error", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("NoSuchKey", { status: 404 }));
    const store = createS3ObjectStore(config, { fetch: fetchMock, now: fixedNow });

    await expect(store.getObject("missing.png")).rejects.toBeInstanceOf(
      ObjectStorageNotFoundError,
    );
  });

  it("deletes objects with a signed request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const store = createS3ObjectStore(config, { fetch: fetchMock, now: fixedNow });

    await store.deleteObject("generation-jobs/job_1/screenshot.png");

    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
