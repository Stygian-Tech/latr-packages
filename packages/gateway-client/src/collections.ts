export const COLLECTION_SAVED_EXTERNAL = "link.latr.saved.external" as const;
export const COLLECTION_SAVED_ITEM = "link.latr.saved.item" as const;

/** Authoritative interoperable bookmark collection. */
export const COLLECTION_BOOKMARK = "community.lexicon.bookmarks.bookmark" as const;

/** L@tr-owned durable fields that are not part of the community bookmark. */
export const COLLECTION_BOOKMARK_METADATA = "link.latr.bookmarks.metadata" as const;

/** Pre-domain-correction collections retained for one-time repo migration. */
export const LEGACY_COLLECTION_SAVED_EXTERNAL = "com.latr.saved.external" as const;
export const LEGACY_COLLECTION_SAVED_ITEM = "com.latr.saved.item" as const;

/** Canonical L@tr permission set for bookmark metadata and reading state. */
export const LATR_AUTH_FULL_PERMISSION_SET = "link.latr.authFull" as const;

/** Cross-namespace bookmark writes cannot be bundled by the L@tr permission set. */
export const LATR_BOOKMARK_REPO_OAUTH_SCOPES = [
  `repo:${COLLECTION_BOOKMARK}?action=create&action=update&action=delete`,
] as const;

/** Human-readable L@tr-owned reading-state permissions. */
export const LATR_READING_STATE_OAUTH_SCOPE =
  `include:${LATR_AUTH_FULL_PERMISSION_SET}` as const;

/** Delete-only grants retained until legacy bookmark migration is retired. */
export const LATR_MIGRATION_CLEANUP_REPO_OAUTH_SCOPES = [
  `repo:${COLLECTION_SAVED_EXTERNAL}?action=delete`,
  `repo:${COLLECTION_SAVED_ITEM}?action=delete`,
  `repo:${LEGACY_COLLECTION_SAVED_EXTERNAL}?action=delete`,
  `repo:${LEGACY_COLLECTION_SAVED_ITEM}?action=delete`,
] as const;

/**
 * Complete L@tr repository access requested by first-party clients.
 *
 * Keep cross-namespace bookmarks and transitional cleanup explicit. Only
 * L@tr-owned bookmark metadata is covered by `link.latr.authFull`.
 */
export const LATR_REPO_OAUTH_SCOPES = [
  ...LATR_BOOKMARK_REPO_OAUTH_SCOPES,
  LATR_READING_STATE_OAUTH_SCOPE,
  ...LATR_MIGRATION_CLEANUP_REPO_OAUTH_SCOPES,
] as const;

export function isLatrExternalWrapperCollection(collection: string): boolean {
  return (
    collection === COLLECTION_SAVED_EXTERNAL ||
    collection === LEGACY_COLLECTION_SAVED_EXTERNAL
  );
}

export function remapLegacyLatrSubjectUri(
  subjectUri: string,
  repositoryDid: string
): string {
  const legacyPrefix = `at://${repositoryDid}/${LEGACY_COLLECTION_SAVED_EXTERNAL}/`;
  if (subjectUri.startsWith(legacyPrefix)) {
    const recordKey = subjectUri.slice(legacyPrefix.length);
    return `at://${repositoryDid}/${COLLECTION_SAVED_EXTERNAL}/${recordKey}`;
  }
  return subjectUri;
}
