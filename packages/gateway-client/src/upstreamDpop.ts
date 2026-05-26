import type { OAuthSession } from "@atproto/oauth-client-browser";

/** PDS XRPC method the gateway write-through path uses for a gateway route. */
export function pdsXrpcMethodForGatewayRequest(
  gatewayMethod: string,
  gatewayPath: string
): { xrpcMethod: string; httpMethod: "GET" | "POST" } | null {
  const method = gatewayMethod.toUpperCase();
  const path = gatewayPath.startsWith("/") ? gatewayPath : `/${gatewayPath}`;

  if (method === "GET" && path === "/v1/latr/saves") {
    return { xrpcMethod: "com.atproto.repo.listRecords", httpMethod: "GET" };
  }
  if (method === "GET" && path.startsWith("/v1/latr/saves/subject")) {
    return { xrpcMethod: "com.atproto.repo.getRecord", httpMethod: "GET" };
  }
  if (method === "POST" && path === "/v1/latr/saves") {
    return { xrpcMethod: "com.atproto.repo.createRecord", httpMethod: "POST" };
  }
  if (method === "PATCH" && path.includes("/v1/latr/saves/") && path.endsWith("/state")) {
    return { xrpcMethod: "com.atproto.repo.putRecord", httpMethod: "POST" };
  }
  if (method === "DELETE" && path.startsWith("/v1/latr/saves/")) {
    return { xrpcMethod: "com.atproto.repo.deleteRecord", httpMethod: "POST" };
  }
  return null;
}

function stripQueryAndFragment(url: string): string {
  const fragmentIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  if (fragmentIndex === -1 && queryIndex === -1) return url;
  if (fragmentIndex === -1) return url.slice(0, queryIndex);
  if (queryIndex === -1) return url.slice(0, fragmentIndex);
  return url.slice(0, Math.min(fragmentIndex, queryIndex));
}

async function sha256Base64Url(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let binary = "";
  for (const byte of view) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type TokenSet = {
  access_token: string;
};

type SessionWithTokenSet = OAuthSession & {
  getTokenSet(refresh: boolean | "auto"): Promise<TokenSet>;
};

export type UpstreamDpopProofOptions = {
  /** Use the same access token the gateway `Authorization` header will carry. */
  accessToken?: string;
  /** Pre-resolved PDS DPoP nonce (avoids re-priming inside proof pools). */
  pdsDpopNonce?: string;
};

async function resolveAccessToken(
  oauthSession: OAuthSession,
  accessToken?: string
): Promise<string> {
  if (accessToken) return accessToken;
  const tokenSet = await (oauthSession as SessionWithTokenSet).getTokenSet("auto");
  return tokenSet.access_token;
}

function pdsOrigin(pdsBase: string): string {
  return new URL(`${pdsBase.replace(/\/$/, "")}/`).origin;
}

async function readCachedNonce(
  oauthSession: OAuthSession,
  origin: string
): Promise<string | undefined> {
  try {
    const cached = await oauthSession.server.dpopNonces.get(origin);
    return cached || undefined;
  } catch {
    return undefined;
  }
}

async function writeCachedNonce(
  oauthSession: OAuthSession,
  origin: string,
  nonce: string
): Promise<void> {
  try {
    await oauthSession.server.dpopNonces.set(origin, nonce);
  } catch {
    // Ignore cache write failures; caller may still use the nonce directly.
  }
}

function nonceFromResponse(response: Response): string | undefined {
  return response.headers.get("DPoP-Nonce") ?? response.headers.get("dpop-nonce") ?? undefined;
}

async function captureNonceFromResponse(
  oauthSession: OAuthSession,
  origin: string,
  response: Response
): Promise<string | undefined> {
  const headerNonce = nonceFromResponse(response);
  if (headerNonce) {
    await writeCachedNonce(oauthSession, origin, headerNonce);
    return headerNonce;
  }
  return readCachedNonce(oauthSession, origin);
}

const LATR_SAVED_ITEM_COLLECTION = "com.latr.saved.item";

/**
 * Ensure the OAuth session has a PDS-bound DPoP nonce before minting upstream proofs.
 *
 * Reads are often accepted without a fresh nonce and may not return `DPoP-Nonce` on
 * success, so we fall back to a lightweight write probe that triggers the standard
 * `use_dpop_nonce` handshake via `@atproto/oauth-client`'s fetch wrapper.
 */
export async function primePdsDpopNonce(
  oauthSession: OAuthSession
): Promise<string | undefined> {
  const tokenInfo = await oauthSession.getTokenInfo();
  const pdsBase = tokenInfo.aud.replace(/\/$/, "");
  const origin = pdsOrigin(pdsBase);

  const existing = await readCachedNonce(oauthSession, origin);
  if (existing) return existing;

  const params = new URLSearchParams({
    repo: oauthSession.did,
    collection: LATR_SAVED_ITEM_COLLECTION,
    limit: "1",
  });

  const listResponse = await oauthSession.fetchHandler(
    `${pdsBase}/xrpc/com.atproto.repo.listRecords?${params}`,
    { method: "GET" }
  );
  const fromList = await captureNonceFromResponse(oauthSession, origin, listResponse);
  if (fromList) return fromList;

  // Writes require a nonce on most PDS hosts; probe createRecord so dpopFetch can
  // capture DPoP-Nonce from use_dpop_nonce even when listRecords succeeded silently.
  const writeProbeResponse = await oauthSession.fetchHandler(
    `${pdsBase}/xrpc/com.atproto.repo.createRecord`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );

  return captureNonceFromResponse(oauthSession, origin, writeProbeResponse);
}

async function resolvePdsDpopNonce(
  oauthSession: OAuthSession,
  pdsBase: string,
  preferred?: string
): Promise<string | undefined> {
  if (preferred) return preferred;
  return readCachedNonce(oauthSession, pdsOrigin(pdsBase));
}

/** Mint a PDS-bound DPoP proof for gateway write-through (`X-ATProto-Upstream-DPoP`). */
export async function createUpstreamDpopProof(
  oauthSession: OAuthSession,
  xrpcMethod: string,
  httpMethod: "GET" | "POST",
  options: UpstreamDpopProofOptions = {}
): Promise<string> {
  const tokenInfo = await oauthSession.getTokenInfo();
  const pdsBase = tokenInfo.aud.replace(/\/$/, "");
  const htu = stripQueryAndFragment(`${pdsBase}/xrpc/${xrpcMethod}`);

  const accessToken = await resolveAccessToken(oauthSession, options.accessToken);
  const ath = await sha256Base64Url(accessToken);
  const nonce =
    (await resolvePdsDpopNonce(oauthSession, pdsBase, options.pdsDpopNonce)) ??
    (await primePdsDpopNonce(oauthSession));

  if (!nonce) {
    throw new Error("PDS DPoP nonce unavailable after priming; retry save");
  }

  const key = oauthSession.server.dpopKey;
  const jwk = key.bareJwk;
  if (!jwk) {
    throw new Error("OAuth session DPoP key is unavailable");
  }

  const supported =
    oauthSession.server.serverMetadata.dpop_signing_alg_values_supported;
  const alg =
    supported?.find((candidate) => key.algorithms.includes(candidate)) ??
    key.algorithms[0];
  if (!alg) {
    throw new Error("OAuth session DPoP key has no supported algorithm");
  }

  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, string | number> = {
    iat: now,
    jti: Math.random().toString(36).slice(2),
    htm: httpMethod,
    htu,
    ath,
    nonce,
  };

  return key.createJwt({ alg, typ: "dpop+jwt", jwk }, claims);
}

export type UpstreamProofSpec = {
  xrpcMethod: string;
  httpMethod: "GET" | "POST";
  count?: number;
};

/** Comma-separated upstream proofs for multi-write gateway routes (one proof per PDS call). */
export async function createUpstreamDpopProofPool(
  oauthSession: OAuthSession,
  specs: UpstreamProofSpec[],
  options: UpstreamDpopProofOptions = {}
): Promise<string> {
  const accessToken = await resolveAccessToken(oauthSession, options.accessToken);
  const pdsDpopNonce =
    options.pdsDpopNonce ?? (await primePdsDpopNonce(oauthSession));

  if (!pdsDpopNonce) {
    throw new Error("PDS DPoP nonce unavailable after priming; retry save");
  }

  const proofOptions: UpstreamDpopProofOptions = { accessToken, pdsDpopNonce };

  const proofs: string[] = [];
  for (const spec of specs) {
    const count = spec.count ?? 1;
    for (let index = 0; index < count; index += 1) {
      proofs.push(
        await createUpstreamDpopProof(
          oauthSession,
          spec.xrpcMethod,
          spec.httpMethod,
          proofOptions
        )
      );
    }
  }
  return proofs.join(",");
}

/** Upstream proofs for POST /v1/latr/saves (url + subject saves may create or update multiple records). */
export async function createSaveUpstreamDpopProofPool(
  oauthSession: OAuthSession,
  options: UpstreamDpopProofOptions = {}
): Promise<string> {
  return createUpstreamDpopProofPool(
    oauthSession,
    [
      { xrpcMethod: "com.atproto.repo.createRecord", httpMethod: "POST", count: 2 },
      { xrpcMethod: "com.atproto.repo.putRecord", httpMethod: "POST", count: 1 },
    ],
    options
  );
}
