export const COLLECTION_SAVED_EXTERNAL = "link.latr.saved.external" as const;
export const COLLECTION_SAVED_ITEM = "link.latr.saved.item" as const;

/** Pre-domain-correction collections retained for one-time repo migration. */
export const LEGACY_COLLECTION_SAVED_EXTERNAL = "com.latr.saved.external" as const;
export const LEGACY_COLLECTION_SAVED_ITEM = "com.latr.saved.item" as const;

export const LATR_REPO_OAUTH_SCOPES = [
  `repo:${COLLECTION_SAVED_EXTERNAL}?action=create&action=update&action=delete`,
  `repo:${COLLECTION_SAVED_ITEM}?action=create&action=update&action=delete`,
  `repo:${LEGACY_COLLECTION_SAVED_EXTERNAL}?action=create&action=update&action=delete`,
  `repo:${LEGACY_COLLECTION_SAVED_ITEM}?action=create&action=update&action=delete`,
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
