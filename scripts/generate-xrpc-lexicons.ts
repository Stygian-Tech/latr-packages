import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(import.meta.dir, "..", "packages", "lexicons");
const errors = [
  "InvalidRequest", "InvalidUrl", "AuthRequired", "InvalidToken", "InvalidDpop",
  "ClientAuthRequired", "SavedItemNotFound", "Conflict", "RateLimitExceeded", "UpstreamFailure",
].map((name) => ({ name }));
const developerErrors = errors.filter(({ name }) => name !== "ClientAuthRequired");
const string = (extra: Record<string, unknown> = {}) => ({ type: "string", ...extra });
const boolean = { type: "boolean" };
const integer = (extra: Record<string, unknown> = {}) => ({ type: "integer", ...extra });
const ref = (value: string) => ({ type: "ref", ref: value });
const array = (items: unknown, extra: Record<string, unknown> = {}) => ({ type: "array", items, ...extra });
const object = (required: string[], properties: Record<string, unknown>) => ({ type: "object", required, properties });
const params = (required: string[], properties: Record<string, unknown>) => ({ type: "params", required, properties });

function schema(id: string, main: Record<string, unknown>, defs: Record<string, unknown> = {}) {
  const describedMain = main.type === "query" || main.type === "procedure"
    ? { description: `L@tr XRPC method ${id}.`, ...main }
    : main;
  return { lexicon: 1, id, defs: { main: describedMain, ...defs } };
}

function defsSchema(id: string, defs: Record<string, unknown>) {
  return { lexicon: 1, id, defs };
}

function query(parameters: unknown, output: unknown, methodErrors = errors) {
  return { type: "query", parameters, output: { encoding: "application/json", schema: output }, errors: methodErrors };
}

function procedure(input: unknown, output: unknown, methodErrors = errors) {
  return {
    type: "procedure",
    input: { encoding: "application/json", schema: input },
    output: { encoding: "application/json", schema: output },
    errors: methodErrors,
  };
}

const simpleOK = ref("link.latr.saved.defs#simpleOk");
const saveOutput = ref("link.latr.saved.defs#saveResult");
const emptyParams = params([], {});
const emptyInput = object([], {});
const bookmarkErrors = [
  "InvalidRequest", "InvalidUrl", "AuthRequired", "InvalidToken", "InvalidDpop",
  "ClientAuthRequired", "BookmarkNotFound", "Conflict", "RateLimitExceeded", "UpstreamFailure",
].map((name) => ({ name }));
const bookmarkSimpleOK = ref("link.latr.bookmarks.defs#simpleOk");
const bookmarkView = ref("link.latr.bookmarks.defs#bookmarkView");
const tagValue = string({ maxLength: 640, maxGraphemes: 64 });
const tagValues = (extra: Record<string, unknown> = {}) => array(tagValue, { maxLength: 100, ...extra });

const schemas: Record<string, unknown> = {
  "link.latr.authFull": schema("link.latr.authFull", {
    type: "permission-set",
    title: "Manage L@tr Reading State",
    detail: "Create, update, and delete L@tr metadata attached to your bookmarks, including unread and archived state.",
    permissions: [{
      type: "permission",
      resource: "repo",
      action: ["create", "update", "delete"],
      collection: ["link.latr.bookmarks.metadata"],
    }],
  }),
  "link.latr.bookmarks.defs": defsSchema("link.latr.bookmarks.defs", {
    communityBookmarkRecord: object(["subject", "createdAt"], {
      subject: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }),
      createdAt: string({ format: "datetime" }),
      tags: tagValues(),
    }),
    bookmarkRecord: object(["uri", "cid", "value"], {
      uri: string({ format: "at-uri" }),
      cid: string({ format: "cid" }),
      value: ref("community.lexicon.bookmarks.bookmark"),
    }),
    metadataRecord: object(["uri", "cid", "value"], {
      uri: string({ format: "at-uri" }),
      cid: string({ format: "cid" }),
      value: ref("link.latr.bookmarks.metadata"),
    }),
    preview: object([], {
      title: string({ maxLength: 2048, maxGraphemes: 512 }),
      description: string({ maxLength: 8192, maxGraphemes: 2048 }),
      image: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }),
      siteName: string({ maxLength: 512, maxGraphemes: 128 }),
      author: string({ maxLength: 512, maxGraphemes: 128 }),
    }),
    bookmarkView: object(["uri", "cid", "value"], {
      uri: string({ format: "at-uri" }),
      cid: string({ format: "cid" }),
      value: ref("community.lexicon.bookmarks.bookmark"),
      metadataRecord: ref("#metadataRecord"),
      preview: ref("#preview"),
    }),
    simpleOk: object(["ok"], { ok: boolean }),
    tagCount: object(["tag", "count"], {
      tag: tagValue,
      count: integer({ minimum: 1 }),
    }),
    tagMutationResult: object(["ok", "scanned", "matched", "updated"], {
      ok: boolean,
      scanned: integer({ minimum: 0 }),
      matched: integer({ minimum: 0 }),
      updated: integer({ minimum: 0 }),
      cursor: string({ maxLength: 2048, maxGraphemes: 512 }),
    }),
    migrationResult: object(["ok", "scanned", "created", "reused", "duplicates", "skippedConflict", "cached", "retired"], {
      ok: boolean,
      scanned: integer({ minimum: 0 }), created: integer({ minimum: 0 }), reused: integer({ minimum: 0 }),
      duplicates: integer({ minimum: 0 }), skippedConflict: integer({ minimum: 0 }), cached: integer({ minimum: 0 }),
      retired: integer({ minimum: 0 }), cursor: string({ maxLength: 2048, maxGraphemes: 512 }),
    }),
    metadataSyncResult: object(["ok", "scanned", "created", "reused", "skippedConflict"], {
      ok: boolean,
      scanned: integer({ minimum: 0 }), created: integer({ minimum: 0 }), reused: integer({ minimum: 0 }),
      skippedConflict: integer({ minimum: 0 }), cursor: string({ maxLength: 2048, maxGraphemes: 512 }),
    }),
  }),
  "link.latr.bookmarks.listBookmarks": schema("link.latr.bookmarks.listBookmarks", query(
    params([], {
      limit: integer({ minimum: 1, maximum: 100, default: 50 }),
      cursor: string({ maxLength: 2048, maxGraphemes: 512 }),
      tag: tagValue,
    }),
    object(["bookmarks"], { bookmarks: array(bookmarkView, { maxLength: 100 }), cursor: string({ maxLength: 2048, maxGraphemes: 512 }) }),
    bookmarkErrors
  )),
  "link.latr.bookmarks.listTags": schema("link.latr.bookmarks.listTags", query(
    params([], {
      limit: integer({ minimum: 1, maximum: 100, default: 100 }),
      cursor: string({ maxLength: 2048, maxGraphemes: 512 }),
    }),
    object(["tagCounts", "scanned"], {
      tagCounts: array(ref("link.latr.bookmarks.defs#tagCount"), { maxLength: 10000 }),
      scanned: integer({ minimum: 0 }),
      cursor: string({ maxLength: 2048, maxGraphemes: 512 }),
    }),
    bookmarkErrors
  )),
  "link.latr.bookmarks.getBookmark": schema("link.latr.bookmarks.getBookmark", query(
    params(["subject"], { subject: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }) }),
    object([], { bookmark: bookmarkView }), bookmarkErrors
  )),
  "link.latr.bookmarks.saveBookmark": schema("link.latr.bookmarks.saveBookmark", procedure(
    object(["subject"], {
      subject: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }),
      tags: tagValues(),
    }), bookmarkView, bookmarkErrors
  )),
  "link.latr.bookmarks.setTags": schema("link.latr.bookmarks.setTags", procedure(
    object(["bookmarkUri", "tags"], {
      bookmarkUri: string({ format: "at-uri", maxLength: 8192, maxGraphemes: 2048 }),
      tags: tagValues(),
    }), bookmarkView, bookmarkErrors
  )),
  "link.latr.bookmarks.renameTag": schema("link.latr.bookmarks.renameTag", procedure(
    object(["tag", "replacement"], {
      tag: tagValue,
      replacement: tagValue,
      limit: integer({ minimum: 1, maximum: 25, default: 25 }),
      cursor: string({ maxLength: 2048, maxGraphemes: 512 }),
    }), ref("link.latr.bookmarks.defs#tagMutationResult"), bookmarkErrors
  )),
  "link.latr.bookmarks.deleteTag": schema("link.latr.bookmarks.deleteTag", procedure(
    object(["tag"], {
      tag: tagValue,
      limit: integer({ minimum: 1, maximum: 25, default: 25 }),
      cursor: string({ maxLength: 2048, maxGraphemes: 512 }),
    }), ref("link.latr.bookmarks.defs#tagMutationResult"), bookmarkErrors
  )),
  "link.latr.bookmarks.syncMetadata": schema("link.latr.bookmarks.syncMetadata", procedure(
    object([], { limit: integer({ minimum: 1, maximum: 100, default: 50 }), cursor: string({ maxLength: 2048, maxGraphemes: 512 }) }),
    ref("link.latr.bookmarks.defs#metadataSyncResult"), bookmarkErrors
  )),
  "link.latr.bookmarks.setState": schema("link.latr.bookmarks.setState", procedure(
    object(["bookmarkUri", "state"], {
      bookmarkUri: string({ format: "at-uri", maxLength: 8192, maxGraphemes: 2048 }),
      state: string({ enum: ["unread", "archived"], maxLength: 16, maxGraphemes: 16 }),
    }), bookmarkSimpleOK, bookmarkErrors
  )),
  "link.latr.bookmarks.deleteBookmark": schema("link.latr.bookmarks.deleteBookmark", procedure(
    object(["bookmarkUri"], { bookmarkUri: string({ format: "at-uri", maxLength: 8192, maxGraphemes: 2048 }) }),
    bookmarkSimpleOK, bookmarkErrors
  )),
  "link.latr.bookmarks.migrateLegacy": schema("link.latr.bookmarks.migrateLegacy", procedure(
    object([], { limit: integer({ minimum: 1, maximum: 100, default: 25 }), cursor: string({ maxLength: 2048, maxGraphemes: 512 }) }),
    ref("link.latr.bookmarks.defs#migrationResult"), bookmarkErrors
  )),
  "link.latr.saved.defs": defsSchema("link.latr.saved.defs", {
    record: object(["uri", "cid", "value"], {
      uri: string({ format: "at-uri" }), cid: string({ format: "cid" }), value: ref("link.latr.saved.item"),
    }),
    simpleOk: object(["ok"], { ok: boolean }),
    saveResult: object(["ok", "kind"], {
      ok: boolean,
      kind: string({ knownValues: ["url", "subject"], maxLength: 16, maxGraphemes: 16 }),
      subjectUri: string({ format: "at-uri", maxLength: 8192, maxGraphemes: 2048 }), linkedWebUrl: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }),
      storage: string({ knownValues: ["native", "external"], maxLength: 16, maxGraphemes: 16 }),
    }),
    migrationResult: object(["ok", "externalCopied", "itemsCopied", "externalDeleted", "itemsDeleted"], {
      ok: boolean, externalCopied: integer({ minimum: 0 }), itemsCopied: integer({ minimum: 0 }),
      externalDeleted: integer({ minimum: 0 }), itemsDeleted: integer({ minimum: 0 }),
    }),
  }),
  "link.latr.saved.listItems": schema("link.latr.saved.listItems", query(
    params(["limit"], { limit: integer({ minimum: 1, maximum: 100 }), cursor: string({ maxLength: 2048, maxGraphemes: 512 }) }),
    object(["records"], { records: array(ref("link.latr.saved.defs#record"), { maxLength: 100 }), cursor: string({ maxLength: 2048, maxGraphemes: 512 }) })
  )),
  "link.latr.saved.getItem": schema("link.latr.saved.getItem", query(
    params(["subjectUri"], { subjectUri: string({ format: "at-uri", maxLength: 8192, maxGraphemes: 2048 }) }),
    object([], { record: ref("link.latr.saved.defs#record") })
  )),
  "link.latr.saved.saveUrl": schema("link.latr.saved.saveUrl", procedure(
    object(["url"], { url: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }) }), saveOutput
  )),
  "link.latr.saved.saveSubject": schema("link.latr.saved.saveSubject", procedure(
    object(["subjectUri"], {
      subjectUri: string({ format: "at-uri", maxLength: 8192, maxGraphemes: 2048 }),
      linkedWebUrl: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }),
    }), saveOutput
  )),
  "link.latr.saved.setState": schema("link.latr.saved.setState", procedure(
    object(["itemRkey", "state"], { itemRkey: string({ format: "record-key", maxLength: 512 }), state: string({ enum: ["unread", "archived"], maxLength: 16, maxGraphemes: 16 }) }), simpleOK
  )),
  "link.latr.saved.deleteItem": schema("link.latr.saved.deleteItem", procedure(
    object(["itemRkey"], { itemRkey: string({ format: "record-key", maxLength: 512 }) }), simpleOK
  )),
  "link.latr.saved.migrateLegacy": schema("link.latr.saved.migrateLegacy", procedure(
    emptyInput, ref("link.latr.saved.defs#migrationResult")
  )),
  "link.latr.preview.getOpenGraph": schema("link.latr.preview.getOpenGraph", query(
    params(["url"], { url: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }) }),
    object([], {
      title: string({ maxLength: 2048, maxGraphemes: 512 }), description: string({ maxLength: 8192, maxGraphemes: 2048 }),
      image: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }), siteName: string({ maxLength: 512, maxGraphemes: 128 }),
      author: string({ maxLength: 512, maxGraphemes: 128 }),
    })
  )),
  "link.latr.discovery.resolveUrl": schema("link.latr.discovery.resolveUrl", query(
    params(["url"], { url: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }) }),
    object(["inputUrl"], {
      inputUrl: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }), normalizedUrl: string({ format: "uri", maxLength: 8192, maxGraphemes: 2048 }),
      atUri: string({ format: "at-uri", maxLength: 8192, maxGraphemes: 2048 }), source: string({ maxLength: 128, maxGraphemes: 128 }),
    })
  )),
  "link.latr.auth.probe": schema("link.latr.auth.probe", query(emptyParams,
    object(["ok", "did", "pdsWriteThrough", "sampleCount", "upstreamDpop"], {
      ok: boolean, did: string({ format: "did" }), clientId: string({ maxLength: 128, maxGraphemes: 128 }),
      pdsWriteThrough: boolean, sampleCount: integer({ minimum: 0 }), upstreamDpop: boolean,
    })
  )),
};

schemas["link.latr.developer.defs"] = defsSchema("link.latr.developer.defs", {
  client: object(["clientId", "kind", "createdAt"], {
    clientId: string({ maxLength: 128, maxGraphemes: 128 }), displayName: string({ maxLength: 256, maxGraphemes: 128 }),
    kind: string({ knownValues: ["developer"], maxLength: 16, maxGraphemes: 16 }), createdAt: string({ format: "datetime" }),
  }),
  key: object(["keyId", "createdAt"], {
    keyId: string({ maxLength: 128, maxGraphemes: 128 }), label: string({ maxLength: 256, maxGraphemes: 128 }),
    createdAt: string({ format: "datetime" }), revokedAt: string({ format: "datetime" }),
  }),
  createdKey: object(["keyId", "clientId", "apiKey", "createdAt"], {
    keyId: string({ maxLength: 128, maxGraphemes: 128 }), clientId: string({ maxLength: 128, maxGraphemes: 128 }),
    apiKey: string({ maxLength: 512, maxGraphemes: 512 }), label: string({ maxLength: 256, maxGraphemes: 128 }), createdAt: string({ format: "datetime" }),
  }),
  usageBucket: object(["routeFamily", "requestCount"], {
    routeFamily: string({ maxLength: 256, maxGraphemes: 256 }), requestCount: integer({ minimum: 0 }),
  }),
  usage: object(["clientId", "usageDate", "buckets"], {
    clientId: string({ maxLength: 128, maxGraphemes: 128 }), usageDate: string({ maxLength: 10, maxGraphemes: 10 }),
    buckets: array(ref("#usageBucket")), dailyLimit: integer({ minimum: 0 }), remaining: integer({ minimum: 0 }),
  }),
});

const devQuery = (id: string, parameters: unknown, output: unknown) => schema(id, query(parameters, output, developerErrors));
const devProcedure = (id: string, input: unknown, output: unknown) => schema(id, procedure(input, output, developerErrors));
Object.assign(schemas, {
  "link.latr.developer.listClients": devQuery("link.latr.developer.listClients", emptyParams, object(["clients"], { clients: array(ref("link.latr.developer.defs#client")) })),
  "link.latr.developer.createClient": devProcedure("link.latr.developer.createClient", object(["clientId"], {
    clientId: string({ maxLength: 128, maxGraphemes: 128 }), displayName: string({ maxLength: 256, maxGraphemes: 128 }),
  }), ref("link.latr.developer.defs#client")),
  "link.latr.developer.deleteClient": devProcedure("link.latr.developer.deleteClient", object(["clientId"], { clientId: string({ maxLength: 128, maxGraphemes: 128 }) }), simpleOK),
  "link.latr.developer.listKeys": devQuery("link.latr.developer.listKeys", params(["clientId"], { clientId: string({ maxLength: 128, maxGraphemes: 128 }) }), object(["keys"], { keys: array(ref("link.latr.developer.defs#key")) })),
  "link.latr.developer.createKey": devProcedure("link.latr.developer.createKey", object(["clientId"], {
    clientId: string({ maxLength: 128, maxGraphemes: 128 }), label: string({ maxLength: 256, maxGraphemes: 128 }),
  }), ref("link.latr.developer.defs#createdKey")),
  "link.latr.developer.revokeKey": devProcedure("link.latr.developer.revokeKey", object(["clientId", "keyId"], {
    clientId: string({ maxLength: 128, maxGraphemes: 128 }), keyId: string({ maxLength: 128, maxGraphemes: 128 }),
  }), simpleOK),
  "link.latr.developer.getUsage": devQuery("link.latr.developer.getUsage", emptyParams, object(["usage"], { usage: array(ref("link.latr.developer.defs#usage")) })),
});

mkdirSync(out, { recursive: true });
for (const [id, value] of Object.entries(schemas)) {
  writeFileSync(join(out, `${id}.json`), `${JSON.stringify(value, null, 2)}\n`);
}
