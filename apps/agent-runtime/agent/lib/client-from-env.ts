import { createOdcApiClient, type OdcApiClient } from "./odc-api-client";

/**
 * Builds the backend API client from environment configuration. Eve tools call
 * this so the only route to the product backend is the typed client.
 */
export function clientFromEnv(): OdcApiClient {
  const baseUrl = process.env.ODC_API_BASE_URL ?? "http://127.0.0.1:3000";
  return createOdcApiClient({ baseUrl });
}
