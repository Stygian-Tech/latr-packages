import { describe, expect, test } from "bun:test";

import {
  bookmarkUpstreamProofPlanForGatewayRequest,
  createBookmarkMigrationRequestInput,
  createSaveUpstreamDpopProofPool,
  createUpstreamDpopProof,
  primePdsDpopNonce,
  refreshPdsDpopNonce,
} from "./upstreamDpop";

describe("bookmarkUpstreamProofPlanForGatewayRequest", () => {
  test("publishes the ordered proof contracts for every bookmark XRPC route", () => {
    const cases = [
      ["GET", "/xrpc/link.latr.bookmarks.listBookmarks?limit=50", "header", 9],
      ["GET", "/xrpc/link.latr.bookmarks.getBookmark#subject", "header", 9],
      ["POST", "/xrpc/link.latr.bookmarks.saveBookmark", "header", 11],
      ["PATCH", "/xrpc/link.latr.bookmarks.setState", "header", 3],
      ["POST", "/xrpc/link.latr.bookmarks.deleteBookmark", "header", 3],
      ["POST", "/xrpc/link.latr.bookmarks.migrateLegacy", "body", 90],
    ] as const;

    for (const [method, path, transport, proofCount] of cases) {
      const plan = bookmarkUpstreamProofPlanForGatewayRequest(method, path);
      expect(plan?.transport).toBe(transport);
      expect(plan?.specs.reduce((sum, spec) => sum + (spec.count ?? 1), 0)).toBe(proofCount);
    }
  });

  test("rejects incorrect verbs and unrelated routes", () => {
    expect(bookmarkUpstreamProofPlanForGatewayRequest("POST", "/xrpc/link.latr.bookmarks.listBookmarks")).toBeNull();
    expect(bookmarkUpstreamProofPlanForGatewayRequest("GET", "/xrpc/link.latr.saved.listItems")).toBeNull();
  });

  test("migration input preserves cursor fields and carries the complete pool", async () => {
    let nonceIndex = 0;
    let proofIndex = 0;
    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({ aud: "https://pds.example" }),
      getTokenSet: async () => ({ access_token: "access-token" }),
      fetchHandler: async () => new Response(null, {
        status: 200,
        headers: { "DPoP-Nonce": `nonce-${++nonceIndex}` },
      }),
      server: {
        dpopNonces: { get: async () => undefined, set: async () => {} },
        dpopKey: {
          bareJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
          algorithms: ["ES256"],
          createJwt: async () => `proof-${++proofIndex}`,
        },
        serverMetadata: { dpop_signing_alg_values_supported: ["ES256"] },
      },
    };

    const input = await createBookmarkMigrationRequestInput(
      oauthSession as never,
      { limit: 12, cursor: "retry-cursor", future: true }
    );

    expect(input.limit).toBe(12);
    expect(input.cursor).toBe("retry-cursor");
    expect(input.future).toBe(true);
    expect(input.upstreamDpopProof.split(",")).toHaveLength(90);
    expect(nonceIndex).toBe(90);
  });
});

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

    expect(probedUrl).toContain("com.atproto.repo.listRecords");
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

  test("calls listRecords when no nonce is cached", async () => {
    const calls: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        return new Response(null, {
          status: 200,
          headers: { "DPoP-Nonce": "listed-nonce" },
        });
      },
      server: {
        dpopNonces: {
          get: async () => undefined,
          set: async () => {},
        },
      },
    };

    const nonce = await primePdsDpopNonce(oauthSession as never);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain(
      "https://pds.example/xrpc/com.atproto.repo.listRecords"
    );
    expect(calls[0]).toContain("repo=did%3Aplc%3Atest");
    expect(nonce).toBe("listed-nonce");
  });

  test("falls back to createRecord when listRecords omits DPoP-Nonce", async () => {
    const calls: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        if (url.includes("listRecords")) {
          return new Response(null, { status: 200 });
        }
        return new Response(null, {
          status: 400,
          headers: { "DPoP-Nonce": "primed-nonce" },
        });
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
    expect(nonce).toBe("primed-nonce");
  });
});

describe("refreshPdsDpopNonce", () => {
  test("advances nonce via listRecords even for write proofs", async () => {
    const calls: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        return new Response(null, {
          status: 200,
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
    expect(calls[0]).toMatch(/^GET .*listRecords\?/);
    expect(nonce).toBe("next-nonce");
  });

  test("falls back to write probe when listRecords omits DPoP-Nonce", async () => {
    const calls: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        if (url.includes("listRecords")) {
          return new Response(null, { status: 200 });
        }
        return new Response(null, {
          status: 400,
          headers: { "DPoP-Nonce": "delete-nonce" },
        });
      },
      server: {
        dpopNonces: {
          get: async () => undefined,
          set: async () => {},
        },
      },
    };

    const nonce = await refreshPdsDpopNonce(
      oauthSession as never,
      "com.atproto.repo.deleteRecord",
      "POST"
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatch(/^GET .*listRecords\?/);
    expect(calls[1]).toContain("com.atproto.repo.deleteRecord");
    expect(nonce).toBe("delete-nonce");
  });

  test("probes listRecords with GET when minting GET upstream proofs", async () => {
    const calls: string[] = [];

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        return new Response(null, {
          status: 403,
          headers: { "DPoP-Nonce": "list-nonce" },
        });
      },
      server: {
        dpopNonces: {
          get: async () => undefined,
          set: async () => {},
        },
      },
    };

    const nonce = await refreshPdsDpopNonce(
      oauthSession as never,
      "com.atproto.repo.listRecords",
      "GET"
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^GET .*listRecords\?/);
    expect(calls[0]).toContain("repo=did%3Aplc%3Atest");
    expect(calls[0]).toContain("collection=community.lexicon.bookmarks.bookmark");
    expect(nonce).toBe("list-nonce");
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
          status: 200,
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

    expect(probeCount).toBe(4);
    expect(proofCount).toBe(4);
    expect(capturedNonces).toEqual(["nonce-1", "nonce-2", "nonce-3", "nonce-4"]);
    expect(pool.split(",")).toHaveLength(4);
  });
});
