import { describe, expect, it } from "bun:test";
import { LATR_API_KEY_HEADER, LATR_CLIENT_ID_HEADER } from "./index";
import { buildDeveloperGatewayHeaders } from "./developer";

describe("buildDeveloperGatewayHeaders", () => {
  it("emits split client id and api key headers", () => {
    const headers = buildDeveloperGatewayHeaders({
      clientId: "my-app",
      apiKey: "lk_test_secret",
    });
    expect(headers[LATR_CLIENT_ID_HEADER]).toBe("my-app");
    expect(headers[LATR_API_KEY_HEADER]).toBe("lk_test_secret");
  });
});
