import { describe, expect, test } from "bun:test";

import { pdsXrpcMethodForGatewayRequest } from "./upstreamDpop";

describe("pdsXrpcMethodForGatewayRequest", () => {
  test("maps save mutations to repo write XRPC methods", () => {
    expect(pdsXrpcMethodForGatewayRequest("POST", "/v1/latr/saves")).toEqual({
      xrpcMethod: "com.atproto.repo.createRecord",
      httpMethod: "POST",
    });
    expect(
      pdsXrpcMethodForGatewayRequest("PATCH", "/v1/latr/saves/abc/state")
    ).toEqual({
      xrpcMethod: "com.atproto.repo.putRecord",
      httpMethod: "POST",
    });
    expect(
      pdsXrpcMethodForGatewayRequest("DELETE", "/v1/latr/saves/abc")
    ).toEqual({
      xrpcMethod: "com.atproto.repo.deleteRecord",
      httpMethod: "POST",
    });
  });
});
