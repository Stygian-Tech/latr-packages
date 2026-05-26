import { describe, expect, it } from "bun:test";
import { LATR_CLIENT_ID_HEADER } from "./index";
describe("latr gateway client headers", () => {
  it("exports client id header", () => {
    expect(LATR_CLIENT_ID_HEADER).toBe("X-Latr-Client-Id");
  });
});
