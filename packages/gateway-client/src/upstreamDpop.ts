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
};

async function resolveAccessToken(
  oauthSession: OAuthSession,
  accessToken?: string
): Promise<string> {
  if (accessToken) return accessToken;
  const tokenSet = await (oauthSession as SessionWithTokenSet).getTokenSet("auto");
  return tokenSet.access_token;
}

async function resolvePdsDpopNonce(
  oauthSession: OAuthSession,
  pdsBase: string
): Promise<string | undefined> {
  const origin = new URL(`${pdsBase.replace(/\/$/, "")}/`).origin;
  try {
    return await oauthSession.server.dpopNonces.get(origin);
  } catch {
    return undefined;
  }
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
  const nonce = await resolvePdsDpopNonce(oauthSession, pdsBase);

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
  };
  if (nonce) {
    claims.nonce = nonce;
  }

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
  const proofOptions = { accessToken };

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
