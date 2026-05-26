export const LATR_CLIENT_ID_HEADER = "X-Latr-Client-Id";
export const LATR_API_KEY_HEADER = "X-Latr-API-Key";
export const LATR_UPSTREAM_DPOP_HEADER = "X-ATProto-Upstream-DPoP";

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
