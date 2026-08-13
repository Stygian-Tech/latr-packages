export const LATR_CLIENT_ID_HEADER = "X-Latr-Client-Id";
export const LATR_API_KEY_HEADER = "X-Latr-API-Key";
export const LATR_UPSTREAM_DPOP_HEADER = "X-ATProto-Upstream-DPoP";

export {
  buildDeveloperGatewayHeaders,
  type CreateDeveloperApiKeyRequest,
  type CreateDeveloperApiKeyResponse,
  type CreateDeveloperClientRequest,
  type DeveloperApiKeySummary,
  type DeveloperClientKind,
  type DeveloperClientSummary,
  type DeveloperGatewayCredentials,
  type DeveloperUsageBucket,
  type DeveloperUsageSummary,
} from "./developer";

export {
  createSaveUpstreamDpopProofPool,
  createUpstreamDpopProof,
  createUpstreamDpopProofPool,
  pdsXrpcMethodForGatewayRequest,
  primePdsDpopNonce,
  refreshPdsDpopNonce,
  type UpstreamDpopProofOptions,
  type UpstreamProofSpec,
} from "./upstreamDpop";

export {
  COLLECTION_SAVED_EXTERNAL,
  COLLECTION_SAVED_ITEM,
  LATR_REPO_OAUTH_SCOPES,
  LEGACY_COLLECTION_SAVED_EXTERNAL,
  LEGACY_COLLECTION_SAVED_ITEM,
  isLatrExternalWrapperCollection,
  remapLegacyLatrSubjectUri,
} from "./collections";

export {
  LATR_GATEWAY_MIGRATE_LEXICONS_PATH,
  LATR_GATEWAY_SAVES_PATH,
  type LatrGatewayLexiconMigrationResponse,
  type LatrGatewayRepoRecord,
  type LatrGatewaySavedItemsResponse,
} from "./saves";

export * from "./xrpc";
