import { describe, expect, test } from "bun:test";

import { createUpstreamDpopProof, primePdsDpopNonce } from "./upstreamDpop";

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
});

describe("primePdsDpopNonce", () => {
  test("calls listRecords when no nonce is cached", async () => {
    let fetchedUrl = "";

    const oauthSession = {
      did: "did:plc:test",
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      fetchHandler: async (url: string) => {
        fetchedUrl = url;
        return new Response(null, { status: 200 });
      },
      server: {
        dpopNonces: {
          get: async () => undefined,
        },
      },
    };

    await primePdsDpopNonce(oauthSession as never);

    expect(fetchedUrl).toContain(
      "https://pds.example/xrpc/com.atproto.repo.listRecords"
    );
    expect(fetchedUrl).toContain("repo=did%3Aplc%3Atest");
  });
});
