import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  entryReadStateRkeyFromSubjectUri,
  latrExternalRkeyFromNormalizedUrl,
  latrFingerprintFromNormalizedUrl,
} from "./index";

const golden = JSON.parse(
  readFileSync(
    join(import.meta.dir, "../fixtures/stygian-golden-vectors.v1.json"),
    "utf8"
  )
).vectors;

describe("@stygian/latr-record-keys golden vectors", () => {
  it("entryReadStateRkey", async () => {
    expect(
      await entryReadStateRkeyFromSubjectUri(golden.entryReadStateRkey.input)
    ).toBe(golden.entryReadStateRkey.canonical);
  });

  it("latrExternalRkey", async () => {
    expect(
      await latrExternalRkeyFromNormalizedUrl(
        golden.latrExternalRkey.normalizedUrl
      )
    ).toBe(golden.latrExternalRkey.canonical);
  });

  it("latrFingerprint", async () => {
    expect(
      await latrFingerprintFromNormalizedUrl(
        golden.latrFingerprint.normalizedUrl
      )
    ).toBe(golden.latrFingerprint.sha256Hex);
  });
});
