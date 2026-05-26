import { describe, expect, test } from "bun:test";

import {
  createSaveUpstreamDpopProofPool,
  createUpstreamDpopProof,
  primePdsDpopNonce,
  refreshPdsDpopNonce,
} from "./upstreamDpop";

describe("createUpstreamDpopProof", () => {
  test("refreshes nonce before minting when none is supplied", async () => {
    let capturedClaims: Record<string, unknown> | undefined;
    let probedUrl = "";

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      getTokenSet: async () => ({ access_token: "access-token" }),
      fetchHandler: async (url: string) => {
        probedUrl = url;
        return new Response(null, {
          status: 400,
          headers: { "DPoP-Nonce": "fresh-nonce" },
        });
      },
      server: {
        dpopNonces: {
          get: async () => "stale-nonce",
        },
        dpopKey: {
          bareJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
          algorithms: ["ES256"],
          createJwt: async (
            _header: Record<string, unknown>,
            claims: Record<string, unknown>
          ) => {
            capturedClaims = claims;
            return "header.payload.signature";
          },
        },
        serverMetadata: {
          dpop_signing_alg_values_supported: ["ES256"],
        },
      },
    };

    await createUpstreamDpopProof(
      oauthSession as never,
      "com.atproto.repo.putRecord",
      "POST",
      { accessToken: "access-token" }
    );

    expect(probedUrl).toContain("com.atproto.repo.putRecord");
    expect(capturedClaims?.nonce).toBe("fresh-nonce");
    expect(capturedClaims?.htu).toBe(
      "https://pds.example/xrpc/com.atproto.repo.putRecord"
    );
  });

  test("uses supplied nonce without probing", async () => {
    let probed = false;
    let capturedClaims: Record<string, unknown> | undefined;

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      getTokenSet: async () => ({ access_token: "access-token" }),
      fetchHandler: async () => {
        probed = true;
        return new Response(null, { status: 200 });
      },
      server: {
        dpopNonces: {
          get: async () => "ignored",
        },
        dpopKey: {
          bareJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
          algorithms: ["ES256"],
          createJwt: async (
            _header: Record<string, unknown>,
            claims: Record<string, unknown>
          ) => {
            capturedClaims = claims;
            return "header.payload.signature";
          },
        },
        serverMetadata: {
          dpop_signing_alg_values_supported: ["ES256"],
        },
      },
    };

    await createUpstreamDpopProof(
      oauthSession as never,
      "com.atproto.repo.createRecord",
      "POST",
      { accessToken: "access-token", pdsDpopNonce: "provided-nonce" }
    );

    expect(probed).toBe(false);
    expect(capturedClaims?.nonce).toBe("provided-nonce");
  });
});

describe("primePdsDpopNonce", () => {
  test("returns cached nonce without probing", async () => {
    let probed = false;
    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async () => {
        probed = true;
        return new Response(null, { status: 200 });
      },
      server: {
        dpopNonces: {
          get: async () => "cached-nonce",
        },
      },
    };

    const nonce = await primePdsDpopNonce(oauthSession as never);
    expect(nonce).toBe("cached-nonce");
    expect(probed).toBe(false);
  });

  test("calls listRecords then write probe when no nonce is cached", async () => {
    const calls: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        return new Response(null, { status: 200 });
      },
      server: {
        dpopNonces: {
          get: async () => undefined,
          set: async () => {},
        },
      },
    };

    const nonce = await primePdsDpopNonce(oauthSession as never);

    expect(calls[0]).toContain(
      "https://pds.example/xrpc/com.atproto.repo.listRecords"
    );
    expect(calls[0]).toContain("repo=did%3Aplc%3Atest");
    expect(calls[1]).toContain("createRecord");
    expect(nonce).toBeUndefined();
  });
});

describe("refreshPdsDpopNonce", () => {
  test("probes the requested XRPC method even when cache is populated", async () => {
    const calls: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        return new Response(null, {
          status: 400,
          headers: { "DPoP-Nonce": "next-nonce" },
        });
      },
      server: {
        dpopNonces: {
          get: async () => "stale-nonce",
          set: async () => {},
        },
      },
    };

    const nonce = await refreshPdsDpopNonce(
      oauthSession as never,
      "com.atproto.repo.putRecord"
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("com.atproto.repo.putRecord");
    expect(nonce).toBe("next-nonce");
  });
});

describe("createSaveUpstreamDpopProofPool", () => {
  test("refreshes once per proof with distinct nonces", async () => {
    let probeCount = 0;
    let proofCount = 0;
    const capturedNonces: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      getTokenSet: async () => ({ access_token: "access-token" }),
      fetchHandler: async () => {
        probeCount += 1;
        return new Response(null, {
          status: 400,
          headers: { "DPoP-Nonce": `nonce-${probeCount}` },
        });
      },
      server: {
        dpopNonces: {
          get: async () => undefined,
          set: async () => {},
        },
        dpopKey: {
          bareJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
          algorithms: ["ES256"],
          createJwt: async (
            _header: Record<string, unknown>,
            claims: Record<string, unknown>
          ) => {
            proofCount += 1;
            capturedNonces.push(String(claims.nonce));
            return `proof-${proofCount}`;
          },
        },
        serverMetadata: {
          dpop_signing_alg_values_supported: ["ES256"],
        },
      },
    };

    const pool = await createSaveUpstreamDpopProofPool(oauthSession as never, {
      accessToken: "access-token",
    });

    expect(probeCount).toBe(3);
    expect(proofCount).toBe(3);
    expect(capturedNonces).toEqual(["nonce-1", "nonce-2", "nonce-3"]);
    expect(pool.split(",")).toHaveLength(3);
  });
});
