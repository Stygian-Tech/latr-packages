import { LATR_API_KEY_HEADER, LATR_CLIENT_ID_HEADER } from "./index";

export type DeveloperClientKind = "developer" | "official";

export type DeveloperClientSummary = {
  clientId: string;
  displayName: string | null;
  kind: DeveloperClientKind;
  createdAt: string;
};

export type DeveloperApiKeySummary = {
  keyId: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type CreateDeveloperClientRequest = {
  /** Machine id sent as `X-Latr-Client-Id` (`^[a-z][a-z0-9_-]{0,62}$`). */
  clientId: string;
  /** Optional human label; any Unicode characters are allowed. */
  displayName?: string;
};

export type CreateDeveloperApiKeyRequest = {
  label?: string;
};

export type CreateDeveloperApiKeyResponse = {
  keyId: string;
  clientId: string;
  apiKey: string;
  label: string | null;
  createdAt: string;
};

export type DeveloperUsageBucket = {
  routeFamily: string;
  requestCount: number;
};

export type DeveloperUsageSummary = {
  clientId: string;
  usageDate: string;
  buckets: DeveloperUsageBucket[];
  dailyLimit: number | null;
  remaining: number | null;
};

export type DeveloperGatewayCredentials = {
  clientId: string;
  apiKey: string;
};

/** Headers for split developer API key authentication. */
export function buildDeveloperGatewayHeaders(
  credentials: DeveloperGatewayCredentials
): Record<string, string> {
  return {
    [LATR_CLIENT_ID_HEADER]: credentials.clientId.trim(),
    [LATR_API_KEY_HEADER]: credentials.apiKey.trim(),
  };
}
