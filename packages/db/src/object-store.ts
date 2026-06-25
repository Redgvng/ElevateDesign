import { createHash, createHmac } from "node:crypto";

export type PutObjectInput = {
  key: string;
  bytes: Buffer;
  contentType: string;
};

export type StoredObject = {
  body: ReadableStream<Uint8Array> | null;
  contentType: string | null;
  contentLength: number | null;
  etag: string | null;
  lastModified: string | null;
};

export type ArtifactObjectStore = {
  putObject(input: PutObjectInput): Promise<void>;
  getObject(key: string): Promise<StoredObject>;
  deleteObject(key: string): Promise<void>;
};

export type S3ObjectStoreConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
};

type S3ObjectStoreDependencies = {
  fetch?: typeof fetch;
  now?: () => Date;
};

export class ObjectStorageNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`Object storage key ${key} was not found`);
    this.name = "ObjectStorageNotFoundError";
  }
}

export function createS3ObjectStore(
  config: S3ObjectStoreConfig,
  dependencies: S3ObjectStoreDependencies = {},
): ArtifactObjectStore {
  const fetchImplementation = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? (() => new Date());

  return {
    async putObject(input) {
      await sendSignedRequest({
        config,
        fetchImplementation,
        now: now(),
        method: "PUT",
        key: input.key,
        body: input.bytes,
        contentType: input.contentType,
      });
    },

    async getObject(key) {
      const response = await sendSignedRequest({
        config,
        fetchImplementation,
        now: now(),
        method: "GET",
        key,
        body: Buffer.alloc(0),
      });

      return {
        body: response.body,
        contentType: response.headers.get("content-type"),
        contentLength: parseContentLength(response.headers.get("content-length")),
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
      };
    },

    async deleteObject(key) {
      await sendSignedRequest({
        config,
        fetchImplementation,
        now: now(),
        method: "DELETE",
        key,
        body: Buffer.alloc(0),
      });
    },
  };
}

type SignedRequestInput = {
  config: S3ObjectStoreConfig;
  fetchImplementation: typeof fetch;
  now: Date;
  method: "GET" | "PUT" | "DELETE";
  key: string;
  body: Buffer;
  contentType?: string;
};

async function sendSignedRequest(input: SignedRequestInput): Promise<Response> {
  const endpoint = new URL(input.config.endpoint);
  const canonicalKey = canonicalizeKey(input.key);
  const url = buildObjectUrl(endpoint, input.config.bucket, canonicalKey, input.config.forcePathStyle);
  const payloadHash = sha256(input.body);
  const amzDate = formatAmzDate(input.now);
  const dateStamp = amzDate.slice(0, 8);
  const headers = new Headers({
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  });

  if (input.contentType) {
    headers.set("content-type", input.contentType);
  }

  const signedHeaderNames = Array.from(headers.keys())
    .map((header) => header.toLowerCase())
    .sort();
  const canonicalHeaders = signedHeaderNames
    .map((header) => `${header}:${normalizeHeaderValue(headers.get(header) ?? "")}`)
    .join("\n");
  const canonicalRequest = [
    input.method,
    url.pathname,
    url.searchParams.toString(),
    `${canonicalHeaders}\n`,
    signedHeaderNames.join(";"),
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${input.config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = createSignature(
    input.config.secretKey,
    dateStamp,
    input.config.region,
    stringToSign,
  );

  headers.set(
    "authorization",
    `AWS4-HMAC-SHA256 Credential=${input.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaderNames.join(";")}, Signature=${signature}`,
  );

  const response = await input.fetchImplementation(url, {
    method: input.method,
    headers,
    body: input.method === "PUT" ? new Uint8Array(input.body) : undefined,
  });

  if (response.status === 404 && input.method === "GET") {
    await response.body?.cancel().catch(() => undefined);
    throw new ObjectStorageNotFoundError(input.key);
  }

  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 2_000);
    throw new Error(
      `Object storage ${input.method} failed with ${response.status}${responseBody ? `: ${responseBody}` : ""}`,
    );
  }

  return response;
}

function buildObjectUrl(
  endpoint: URL,
  bucket: string,
  canonicalKey: string,
  forcePathStyle: boolean,
): URL {
  const url = new URL(endpoint.toString());
  url.search = "";
  url.hash = "";

  if (forcePathStyle) {
    const basePath = url.pathname.replace(/\/$/, "");
    url.pathname = `${basePath}/${encodeURIComponent(bucket)}/${canonicalKey}`;
    return url;
  }

  url.hostname = `${bucket}.${url.hostname}`;
  const basePath = url.pathname.replace(/\/$/, "");
  url.pathname = `${basePath}/${canonicalKey}`;
  return url;
}

function canonicalizeKey(key: string): string {
  const normalized = key.replace(/^\/+/, "");
  if (!normalized) throw new Error("Object storage key cannot be empty");

  return normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, percentEncodeCharacter))
    .join("/");
}

function percentEncodeCharacter(character: string): string {
  return `%${character.charCodeAt(0).toString(16).toUpperCase()}`;
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function normalizeHeaderValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function createSignature(
  secretKey: string,
  dateStamp: string,
  region: string,
  stringToSign: string,
): string {
  const dateKey = hmac(`AWS4${secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  return createHmac("sha256", signingKey).update(stringToSign).digest("hex");
}
