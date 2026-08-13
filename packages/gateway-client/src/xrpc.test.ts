import { describe, expect, test } from "bun:test";
import { LATR_XRPC, LatrXrpcClient, latrXrpcPath } from "./xrpc";

describe("generated L@tr XRPC descriptors", () => {
  test("publishes all methods with exact verbs", () => {
    expect(Object.keys(LATR_XRPC)).toHaveLength(17);
    expect(LATR_XRPC.listItems.method).toBe("GET");
    expect(LATR_XRPC.saveUrl.method).toBe("POST");
    expect(LATR_XRPC.listClients.requiresApplicationCredential).toBe(false);
    expect(latrXrpcPath(LATR_XRPC.setState)).toBe("/xrpc/link.latr.saved.setState");
  });

  test("client forwards the resolved method and input", async () => {
    const calls: unknown[] = [];
    const client = new LatrXrpcClient({
      async request(method, options) { calls.push({ method, options }); return { ok: true }; },
    });
    await client.setState({ itemRkey: "abc", state: "archived" });
    expect(calls).toEqual([{ method: LATR_XRPC.setState, options: { input: { itemRkey: "abc", state: "archived" } } }]);
  });
});
