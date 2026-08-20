import { describe, expect, test } from "bun:test";

import {
  LATR_AUTH_FULL_PERMISSION_SET,
  LATR_BOOKMARK_REPO_OAUTH_SCOPES,
  LATR_MIGRATION_CLEANUP_REPO_OAUTH_SCOPES,
  LATR_READING_STATE_OAUTH_SCOPE,
  LATR_REPO_OAUTH_SCOPES,
} from "./collections";

describe("L@tr OAuth scopes", () => {
  test("groups bookmark, reading-state, and migration access without broad grants", () => {
    expect(LATR_AUTH_FULL_PERMISSION_SET).toBe("link.latr.authFull");
    expect(LATR_BOOKMARK_REPO_OAUTH_SCOPES).toEqual([
      "repo:community.lexicon.bookmarks.bookmark?action=create&action=update&action=delete",
    ]);
    expect(LATR_READING_STATE_OAUTH_SCOPE).toBe("include:link.latr.authFull");
    expect(LATR_MIGRATION_CLEANUP_REPO_OAUTH_SCOPES).toEqual([
      "repo:link.latr.saved.external?action=delete",
      "repo:link.latr.saved.item?action=delete",
      "repo:com.latr.saved.external?action=delete",
      "repo:com.latr.saved.item?action=delete",
    ]);
    expect(LATR_REPO_OAUTH_SCOPES).toEqual([
      ...LATR_BOOKMARK_REPO_OAUTH_SCOPES,
      LATR_READING_STATE_OAUTH_SCOPE,
      ...LATR_MIGRATION_CLEANUP_REPO_OAUTH_SCOPES,
    ]);
    expect(LATR_REPO_OAUTH_SCOPES).not.toContain(
      "repo:link.latr.bookmarks.metadata?action=create&action=update&action=delete"
    );
    expect(LATR_REPO_OAUTH_SCOPES.join(" ")).not.toMatch(
      /transition:generic|repo:\*/
    );
  });
});
