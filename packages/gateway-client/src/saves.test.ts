import { describe, expect, it } from "bun:test";

import { pdsXrpcMethodForGatewayRequest } from "./upstreamDpop";
import { LATR_GATEWAY_SAVES_PATH } from "./saves";

describe("LATR_GATEWAY_SAVES_PATH", () => {
  it("maps GET list to com.atproto.repo.listRecords", () => {
    expect(pdsXrpcMethodForGatewayRequest("GET", LATR_GATEWAY_SAVES_PATH)).toEqual({
      xrpcMethod: "com.atproto.repo.listRecords",
      httpMethod: "GET",
    });
  });
});
