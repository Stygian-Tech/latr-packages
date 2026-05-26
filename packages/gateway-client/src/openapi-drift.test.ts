import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("latr gateway OpenAPI contract", () => {
  it("declares core save routes", () => {
    const spec = readFileSync(
      join(import.meta.dir, "../../../openapi/latr-gateway.v1.yaml"),
      "utf8"
    );
    expect(spec).toContain("/v1/latr/saves");
    expect(spec).toContain("/health");
  });
});
