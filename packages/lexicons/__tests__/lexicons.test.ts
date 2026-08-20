import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

function collectJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(full));
    } else if (entry.name.endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

describe("lexicon JSON schemas", () => {
  const files = collectJsonFiles(ROOT).filter(
    (f) => !f.endsWith("package.json")
  );

  it("includes expected L@tr collections", () => {
    const names = files.map((f) => f.split("/").pop());
    expect(names).toContain("link.latr.saved.external.json");
    expect(names).toContain("link.latr.saved.item.json");
    expect(names).toContain("link.latr.bookmarks.metadata.json");
    expect(names).toContain("link.latr.authFull.json");
  });

  for (const file of files) {
    it(`parses ${file.replace(ROOT + "/", "")}`, () => {
      const raw = readFileSync(file, "utf8");
      const json = JSON.parse(raw) as {
        lexicon?: number;
        id?: string;
        defs?: Record<string, unknown>;
      };
      expect(json.lexicon).toBe(1);
      expect(json.id).toBeTruthy();
      expect(json.defs).toBeTruthy();
    });
  }
});

describe("L@tr permission set", () => {
  it("grants only L@tr-owned bookmark metadata mutations", () => {
    const schema = JSON.parse(
      readFileSync(join(ROOT, "link.latr.authFull.json"), "utf8")
    ) as {
      id: string;
      defs: {
        main: {
          type: string;
          title: string;
          detail: string;
          permissions: unknown[];
        };
      };
    };

    expect(schema).toEqual({
      lexicon: 1,
      id: "link.latr.authFull",
      defs: {
        main: {
          type: "permission-set",
          title: "Manage L@tr Reading State",
          detail:
            "Create, update, and delete L@tr metadata attached to your bookmarks, including unread and archived state.",
          permissions: [
            {
              type: "permission",
              resource: "repo",
              action: ["create", "update", "delete"],
              collection: ["link.latr.bookmarks.metadata"],
            },
          ],
        },
      },
    });
  });
});

describe("saved item schema", () => {
  it("main record requires subjectUri and savedAt", () => {
    const schema = JSON.parse(
      readFileSync(join(ROOT, "link.latr.saved.item.json"), "utf8")
    ) as {
      defs: { main: { record: { required?: string[] } } };
    };
    expect(schema.defs.main.record.required).toContain("subjectUri");
    expect(schema.defs.main.record.required).toContain("savedAt");
  });
});

describe("XRPC method contracts", () => {
  const methodFiles = collectJsonFiles(ROOT).filter((file) => {
    if (file.endsWith("package.json")) return false;
    const json = JSON.parse(readFileSync(file, "utf8")) as { defs?: { main?: { type?: string } } };
    return ["query", "procedure"].includes(json.defs?.main?.type ?? "");
  });

  it("publishes all 28 methods", () => expect(methodFiles).toHaveLength(28));

  it("keeps generated client descriptors in parity with published methods", async () => {
    const { LATR_XRPC } = await import("../../gateway-client/src/xrpc");
    const published = methodFiles.map((file) => file.split("/").pop()?.replace(/\.json$/, "")).sort();
    const described = Object.values(LATR_XRPC).map((method) => method.nsid).sort();
    expect(described).toEqual(published);
  });

  for (const file of methodFiles) {
    it(`${file.split("/").pop()} declares transport and stable errors`, () => {
      const json = JSON.parse(readFileSync(file, "utf8")) as {
        id: string;
        defs: { main: { type: "query" | "procedure"; parameters?: unknown; input?: { encoding?: string }; output?: { encoding?: string }; errors?: Array<{ name?: string }> } };
      };
      expect(json.id).toBe(file.split("/").pop()?.replace(/\.json$/, ""));
      expect(json.defs.main.output?.encoding).toBe("application/json");
      if (json.defs.main.type === "query") expect(json.defs.main.parameters).toBeTruthy();
      else expect(json.defs.main.input?.encoding).toBe("application/json");
      expect(json.defs.main.errors?.map((error) => error.name)).toContain("InvalidRequest");
      expect(json.defs.main.errors?.map((error) => error.name)).toContain("UpstreamFailure");
    });
  }
});

describe("bookmark tag XRPC contracts", () => {
  function main(id: string) {
    return (JSON.parse(readFileSync(join(ROOT, `${id}.json`), "utf8")) as {
      defs: { main: Record<string, unknown> };
    }).defs.main;
  }

  it("publishes exact query and procedure kinds", () => {
    expect(main("link.latr.bookmarks.listBookmarks").type).toBe("query");
    expect(main("link.latr.bookmarks.listTags").type).toBe("query");
    expect(main("link.latr.bookmarks.setTags").type).toBe("procedure");
    expect(main("link.latr.bookmarks.renameTag").type).toBe("procedure");
    expect(main("link.latr.bookmarks.deleteTag").type).toBe("procedure");
  });

  it("preserves bounded tag limits in every public input", () => {
    const listTags = main("link.latr.bookmarks.listTags") as {
      parameters: { properties: { limit: { maximum: number } } };
    };
    const renameTag = main("link.latr.bookmarks.renameTag") as {
      input: { schema: { properties: { limit: { maximum: number } } } };
    };
    const deleteTag = main("link.latr.bookmarks.deleteTag") as {
      input: { schema: { properties: { limit: { maximum: number } } } };
    };
    const setTags = main("link.latr.bookmarks.setTags") as {
      input: { schema: { required: string[]; properties: { tags: { maxLength: number; items: { maxLength: number; maxGraphemes: number } } } } };
    };

    expect(listTags.parameters.properties.limit.maximum).toBe(100);
    expect(renameTag.input.schema.properties.limit.maximum).toBe(25);
    expect(deleteTag.input.schema.properties.limit.maximum).toBe(25);
    expect(setTags.input.schema.required).toEqual(["bookmarkUri", "tags"]);
    expect(setTags.input.schema.properties.tags.maxLength).toBe(100);
    expect(setTags.input.schema.properties.tags.items).toMatchObject({ maxLength: 640, maxGraphemes: 64 });
  });
});
