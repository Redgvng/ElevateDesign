import { describe, expect, it, vi } from "vitest";
import { createS3ObjectStore } from "./objectStore";

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
  it("uploads bytes to a path-style S3 endpoint with AWS Signature V4", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const store = createS3ObjectStore(config, { fetch: fetchMock, now: fixedNow });

    await store.putObject({
      key: "generation-jobs/job 1/screenshot.png",
      bytes: Buffer.from("png-bytes"),
      contentType: "image/png",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://127.0.0.1:9000/odc-artifacts/generation-jobs/job%201/screenshot.png",
    );
    expect(init?.method).toBe("PUT");

    const headers = new Headers(init?.headers);
    expect(headers.get("content-type")).toBe("image/png");
    expect(headers.get("x-amz-date")).toBe("20260618T100000Z");
    expect(headers.get("x-amz-content-sha256")).toMatch(/^[a-f0-9]{64}$/);
    expect(headers.get("authorization")).toContain(
      "Credential=odc_minio/20260618/us-east-1/s3/aws4_request",
    );
    expect(headers.get("authorization")).toContain(
      "SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date",
    );
    expect(Buffer.from(init?.body as Uint8Array).toString()).toBe("png-bytes");
  });

  it("deletes the uploaded object using a signed DELETE request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const store = createS3ObjectStore(config, { fetch: fetchMock, now: fixedNow });

    await store.deleteObject("generation-jobs/job_1/screenshot.png");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://127.0.0.1:9000/odc-artifacts/generation-jobs/job_1/screenshot.png",
    );
    expect(init?.method).toBe("DELETE");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("authorization")).toContain("SignedHeaders=host;");
  });

  it("surfaces object storage errors with a bounded response body", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Access denied", { status: 403 }));
    const store = createS3ObjectStore(config, { fetch: fetchMock, now: fixedNow });

    await expect(
      store.putObject({
        key: "generation-jobs/job_1/screenshot.png",
        bytes: Buffer.from("png"),
        contentType: "image/png",
      }),
    ).rejects.toThrow("Object storage PUT failed with 403: Access denied");
  });
});
