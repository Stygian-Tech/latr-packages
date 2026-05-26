import { describe, expect, test } from "bun:test";

import {
  createSaveUpstreamDpopProofPool,
  createUpstreamDpopProof,
  primePdsDpopNonce,
} from "./upstreamDpop";

describe("createUpstreamDpopProof", () => {
  test("includes cached PDS DPoP nonce when available", async () => {
    let capturedClaims: Record<string, unknown> | undefined;
    let primed = false;

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      getTokenSet: async () => ({ access_token: "access-token" }),
      fetchHandler: async () => {
        primed = true;
        return new Response(null, {
          status: 200,
          headers: { "DPoP-Nonce": "fresh-nonce" },
        });
      },
      server: {
        dpopNonces: {
          get: async () => "server-nonce",
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
      { accessToken: "access-token" }
    );

    expect(primed).toBe(false);
    expect(capturedClaims?.nonce).toBe("server-nonce");
    expect(capturedClaims?.htu).toBe(
      "https://pds.example/xrpc/com.atproto.repo.createRecord"
    );
  });

  test("uses nonce from priming response header when cache is empty", async () => {
    let capturedClaims: Record<string, unknown> | undefined;
    const stored = new Map<string, string>();

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      getTokenSet: async () => ({ access_token: "access-token" }),
      fetchHandler: async (url: string) => {
        if (url.includes("listRecords")) {
          return new Response(null, {
            status: 200,
            headers: { "DPoP-Nonce": "header-nonce" },
          });
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
      server: {
        dpopNonces: {
          get: async (origin: string) => stored.get(origin),
          set: async (origin: string, nonce: string) => {
            stored.set(origin, nonce);
          },
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
      { accessToken: "access-token" }
    );

    expect(capturedClaims?.nonce).toBe("header-nonce");
    expect(stored.get("https://pds.example")).toBe("header-nonce");
  });
});

describe("primePdsDpopNonce", () => {
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

  test("falls back to createRecord probe when listRecords omits nonce", async () => {
    const calls: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        if (url.includes("createRecord")) {
          return new Response(null, {
            status: 401,
            headers: {
              "DPoP-Nonce": "write-probe-nonce",
              "WWW-Authenticate": 'DPoP error="use_dpop_nonce"',
            },
          });
        }
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

    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("listRecords");
    expect(calls[1]).toContain("createRecord");
    expect(nonce).toBe("write-probe-nonce");
  });
});

describe("createSaveUpstreamDpopProofPool", () => {
  test("primes once and reuses nonce for all proofs", async () => {
    let primeCalls = 0;
    let proofCount = 0;

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      getTokenSet: async () => ({ access_token: "access-token" }),
      fetchHandler: async () => {
        primeCalls += 1;
        return new Response(null, {
          status: 200,
          headers: { "DPoP-Nonce": "shared-nonce" },
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
            expect(claims.nonce).toBe("shared-nonce");
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

    expect(primeCalls).toBe(1);
    expect(proofCount).toBe(3);
    expect(pool.split(",")).toHaveLength(3);
  });
});
