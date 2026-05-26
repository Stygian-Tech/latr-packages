import { describe, expect, test } from "bun:test";

import { createUpstreamDpopProof } from "./upstreamDpop";

describe("createUpstreamDpopProof", () => {
  test("includes cached PDS DPoP nonce when available", async () => {
    let capturedClaims: Record<string, unknown> | undefined;

    const oauthSession = {
      getTokenInfo: async () => ({
        aud: "https://pds.example",
      }),
      getTokenSet: async () => ({ access_token: "access-token" }),
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

    expect(capturedClaims?.nonce).toBe("server-nonce");
    expect(capturedClaims?.htu).toBe(
      "https://pds.example/xrpc/com.atproto.repo.createRecord"
    );
  });
});
