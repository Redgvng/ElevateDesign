import { createS3ObjectStore, type ArtifactObjectStore } from "@odc/db";
import type { AppConfig } from "../config";

export function createConfiguredArtifactObjectStore(
  config: AppConfig,
): ArtifactObjectStore | null {
  const { endpoint, region, bucket, accessKey, secretKey, forcePathStyle } =
    config.objectStorage;

  if (!endpoint || !accessKey || !secretKey) return null;

  return createS3ObjectStore({
    endpoint,
    region,
    bucket,
    accessKey,
    secretKey,
    forcePathStyle,
  });
}
