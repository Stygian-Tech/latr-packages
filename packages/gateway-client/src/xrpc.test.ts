import { describe, expect, test } from "bun:test";
import { LATR_XRPC, LatrXrpcClient, latrXrpcPath } from "./xrpc";

describe("generated L@tr XRPC descriptors", () => {
  test("publishes all methods with exact verbs", () => {
    expect(Object.keys(LATR_XRPC)).toHaveLength(28);
    expect(LATR_XRPC.listBookmarks.method).toBe("GET");
    expect(LATR_XRPC.listTags.method).toBe("GET");
    expect(latrXrpcPath(LATR_XRPC.saveBookmark)).toBe("/xrpc/link.latr.bookmarks.saveBookmark");
    expect(latrXrpcPath(LATR_XRPC.syncBookmarkMetadata)).toBe("/xrpc/link.latr.bookmarks.syncMetadata");
    expect(latrXrpcPath(LATR_XRPC.setBookmarkTags)).toBe("/xrpc/link.latr.bookmarks.setTags");
    expect(LATR_XRPC.renameBookmarkTag.method).toBe("POST");
    expect(LATR_XRPC.deleteBookmarkTag.method).toBe("POST");
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

  test("bookmark client uses generic URI subjects", async () => {
    const calls: unknown[] = [];
    const client = new LatrXrpcClient({
      async request(method, options) { calls.push({ method, options }); return { uri: "at://did:plc:test/community.lexicon.bookmarks.bookmark/3abc", cid: "bafytest", value: {} }; },
    });
    await client.saveBookmark({ subject: "https://example.com/article", tags: ["news"] });
    expect(calls).toEqual([{ method: LATR_XRPC.saveBookmark, options: { input: { subject: "https://example.com/article", tags: ["news"] } } }]);
  });

  test("bookmark client forwards metadata synchronization input", async () => {
    const calls: unknown[] = [];
    const client = new LatrXrpcClient({
      async request(method, options) { calls.push({ method, options }); return { ok: true, scanned: 0, created: 0, reused: 0, skippedConflict: 0 }; },
    });
    await client.syncBookmarkMetadata({ limit: 25, cursor: "next" });
    expect(calls).toEqual([{ method: LATR_XRPC.syncBookmarkMetadata, options: { input: { limit: 25, cursor: "next" } } }]);
  });

  test("bookmark client forwards exact tag query and mutation shapes", async () => {
    const calls: unknown[] = [];
    const client = new LatrXrpcClient({
      async request(method, options) { calls.push({ method, options }); return { ok: true }; },
    });
    await client.listBookmarks({ limit: 50, cursor: "page-2", tag: "funny videos" });
    await client.listTags({ limit: 100, cursor: "tags-2" });
    await client.setBookmarkTags({ bookmarkUri: "at://did:plc:test/community.lexicon.bookmarks.bookmark/3abc", tags: [] });
    await client.renameBookmarkTag({ tag: "News", replacement: "Reading", limit: 25, cursor: "rename-2" });
    await client.deleteBookmarkTag({ tag: "Later", limit: 25 });
    expect(calls).toEqual([
      { method: LATR_XRPC.listBookmarks, options: { params: { limit: 50, cursor: "page-2", tag: "funny videos" } } },
      { method: LATR_XRPC.listTags, options: { params: { limit: 100, cursor: "tags-2" } } },
      { method: LATR_XRPC.setBookmarkTags, options: { input: { bookmarkUri: "at://did:plc:test/community.lexicon.bookmarks.bookmark/3abc", tags: [] } } },
      { method: LATR_XRPC.renameBookmarkTag, options: { input: { tag: "News", replacement: "Reading", limit: 25, cursor: "rename-2" } } },
      { method: LATR_XRPC.deleteBookmarkTag, options: { input: { tag: "Later", limit: 25 } } },
    ]);
  });
});
