export type LatrXrpcKind = "query" | "procedure";
export type LatrXrpcDescriptor = Readonly<{ nsid: string; kind: LatrXrpcKind; method: "GET" | "POST"; requiresApplicationCredential: boolean }>;
function descriptor(nsid: string, kind: LatrXrpcKind, requiresApplicationCredential = true): LatrXrpcDescriptor {
  return Object.freeze({ nsid, kind, method: kind === "query" ? "GET" : "POST", requiresApplicationCredential });
}
export const LATR_XRPC = Object.freeze({
  listBookmarks: descriptor("link.latr.bookmarks.listBookmarks", "query"),
  listTags: descriptor("link.latr.bookmarks.listTags", "query"),
  getBookmark: descriptor("link.latr.bookmarks.getBookmark", "query"),
  saveBookmark: descriptor("link.latr.bookmarks.saveBookmark", "procedure"),
  setBookmarkTags: descriptor("link.latr.bookmarks.setTags", "procedure"),
  renameBookmarkTag: descriptor("link.latr.bookmarks.renameTag", "procedure"),
  deleteBookmarkTag: descriptor("link.latr.bookmarks.deleteTag", "procedure"),
  syncBookmarkMetadata: descriptor("link.latr.bookmarks.syncMetadata", "procedure"),
  setBookmarkState: descriptor("link.latr.bookmarks.setState", "procedure"),
  deleteBookmark: descriptor("link.latr.bookmarks.deleteBookmark", "procedure"),
  migrateBookmarks: descriptor("link.latr.bookmarks.migrateLegacy", "procedure"),
  /** @deprecated One-release compatibility descriptors. */
  listItems: descriptor("link.latr.saved.listItems", "query"), getItem: descriptor("link.latr.saved.getItem", "query"),
  saveUrl: descriptor("link.latr.saved.saveUrl", "procedure"), saveSubject: descriptor("link.latr.saved.saveSubject", "procedure"),
  setState: descriptor("link.latr.saved.setState", "procedure"), deleteItem: descriptor("link.latr.saved.deleteItem", "procedure"),
  migrateLegacy: descriptor("link.latr.saved.migrateLegacy", "procedure"), getOpenGraph: descriptor("link.latr.preview.getOpenGraph", "query"),
  resolveUrl: descriptor("link.latr.discovery.resolveUrl", "query"), authProbe: descriptor("link.latr.auth.probe", "query"),
  listClients: descriptor("link.latr.developer.listClients", "query", false), createClient: descriptor("link.latr.developer.createClient", "procedure", false),
  deleteClient: descriptor("link.latr.developer.deleteClient", "procedure", false), listKeys: descriptor("link.latr.developer.listKeys", "query", false),
  createKey: descriptor("link.latr.developer.createKey", "procedure", false), revokeKey: descriptor("link.latr.developer.revokeKey", "procedure", false),
  getUsage: descriptor("link.latr.developer.getUsage", "query", false),
});
export type LatrXrpcMethod = (typeof LATR_XRPC)[keyof typeof LATR_XRPC];
export const latrXrpcPath = (method: LatrXrpcMethod | string) => `/xrpc/${typeof method === "string" ? method : method.nsid}`;
export type LatrXrpcErrorName = "InvalidRequest" | "InvalidUrl" | "AuthRequired" | "InvalidToken" | "InvalidDpop" | "ClientAuthRequired" | "BookmarkNotFound" | "SavedItemNotFound" | "Conflict" | "RateLimitExceeded" | "UpstreamFailure";
export type LatrXrpcErrorBody = { error: LatrXrpcErrorName | "XrpcNotSupported"; message: string };
export type LatrRepoRecord<T> = { uri: string; cid: string; value: T };
export type CommunityBookmarkRecord = {
  $type: "community.lexicon.bookmarks.bookmark";
  subject: string;
  createdAt: string;
  tags?: string[];
  [key: string]: unknown;
};
export type LatrBookmarkMetadataRecord = {
  $type: "link.latr.bookmarks.metadata";
  bookmarkUri: string;
  subject: string;
  state?: "unread" | "archived";
  note?: string;
  lastOpenedAt?: string;
  legacyItemUris?: string[];
  [key: string]: unknown;
};
export type LatrBookmarkPreview = {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  author?: string;
};
export type LatrBookmarkView = LatrRepoRecord<CommunityBookmarkRecord> & {
  metadataRecord?: LatrRepoRecord<LatrBookmarkMetadataRecord>;
  preview?: LatrBookmarkPreview;
};
export type LatrListBookmarksParams = { limit?: number; cursor?: string; tag?: string };
export type LatrListBookmarksOutput = { bookmarks: LatrBookmarkView[]; cursor?: string };
export type LatrTagCount = { tag: string; count: number };
export type LatrListTagsParams = { limit?: number; cursor?: string };
export type LatrListTagsOutput = { tagCounts: LatrTagCount[]; scanned: number; cursor?: string };
export type LatrSaveBookmarkInput = { subject: string; tags?: string[] };
export type LatrSetBookmarkTagsInput = { bookmarkUri: string; tags: string[] };
export type LatrRenameBookmarkTagInput = { tag: string; replacement: string; limit?: number; cursor?: string };
export type LatrDeleteBookmarkTagInput = { tag: string; limit?: number; cursor?: string };
export type LatrTagMutationResult = { ok: boolean; scanned: number; matched: number; updated: number; cursor?: string };
export type LatrSyncBookmarkMetadataInput = { limit?: number; cursor?: string };
export type LatrBookmarkMetadataSyncResult = {
  ok: boolean;
  scanned: number;
  created: number;
  reused: number;
  skippedConflict: number;
  cursor?: string;
};
export type LatrSetBookmarkStateInput = { bookmarkUri: string; state: "unread" | "archived" };
export type LatrDeleteBookmarkInput = { bookmarkUri: string };
export type LatrMigrationInput = { limit?: number; cursor?: string };
export type LatrMigrationResult = {
  ok: boolean;
  scanned: number;
  created: number;
  reused: number;
  duplicates: number;
  skippedConflict: number;
  cached: number;
  retired: number;
  cursor?: string;
};
export type LatrListItemsParams = { limit: number; cursor?: string };
export type LatrListItemsOutput<T> = { records: LatrRepoRecord<T>[]; cursor?: string };
export type LatrSaveUrlInput = { url: string };
export type LatrSaveSubjectInput = { subjectUri: string; linkedWebUrl?: string };
export type LatrSetStateInput = { itemRkey: string; state: "unread" | "archived" };
export type LatrDeleteItemInput = { itemRkey: string };
export type LatrSaveResult = { ok: boolean; kind: "url" | "subject"; subjectUri?: string; linkedWebUrl?: string; storage?: "native" | "external" };
export type LatrSimpleOk = { ok: boolean };
export interface LatrXrpcTransport { request<TOutput>(method: LatrXrpcMethod, options?: { params?: Record<string, string | number>; input?: unknown }): Promise<TOutput>; }
export class LatrXrpcClient {
  constructor(private readonly transport: LatrXrpcTransport) {}
  listBookmarks(parameters: LatrListBookmarksParams = {}) { return this.transport.request<LatrListBookmarksOutput>(LATR_XRPC.listBookmarks, { params: parameters }); }
  listTags(parameters: LatrListTagsParams = {}) { return this.transport.request<LatrListTagsOutput>(LATR_XRPC.listTags, { params: parameters }); }
  getBookmark(subject: string) { return this.transport.request<{ bookmark?: LatrBookmarkView }>(LATR_XRPC.getBookmark, { params: { subject } }); }
  saveBookmark(input: LatrSaveBookmarkInput) { return this.transport.request<LatrBookmarkView>(LATR_XRPC.saveBookmark, { input }); }
  setBookmarkTags(input: LatrSetBookmarkTagsInput) { return this.transport.request<LatrBookmarkView>(LATR_XRPC.setBookmarkTags, { input }); }
  renameBookmarkTag(input: LatrRenameBookmarkTagInput) { return this.transport.request<LatrTagMutationResult>(LATR_XRPC.renameBookmarkTag, { input }); }
  deleteBookmarkTag(input: LatrDeleteBookmarkTagInput) { return this.transport.request<LatrTagMutationResult>(LATR_XRPC.deleteBookmarkTag, { input }); }
  syncBookmarkMetadata(input: LatrSyncBookmarkMetadataInput = {}) { return this.transport.request<LatrBookmarkMetadataSyncResult>(LATR_XRPC.syncBookmarkMetadata, { input }); }
  setBookmarkState(input: LatrSetBookmarkStateInput) { return this.transport.request<LatrSimpleOk>(LATR_XRPC.setBookmarkState, { input }); }
  deleteBookmark(input: LatrDeleteBookmarkInput) { return this.transport.request<LatrSimpleOk>(LATR_XRPC.deleteBookmark, { input }); }
  migrateLegacy(input: LatrMigrationInput = {}) { return this.transport.request<LatrMigrationResult>(LATR_XRPC.migrateBookmarks, { input }); }
  /** @deprecated Use bookmark-centric methods above. */
  listItems<T>(parameters: LatrListItemsParams) { return this.transport.request<LatrListItemsOutput<T>>(LATR_XRPC.listItems, { params: parameters }); }
  getItem<T>(subjectUri: string) { return this.transport.request<{ record?: LatrRepoRecord<T> }>(LATR_XRPC.getItem, { params: { subjectUri } }); }
  saveUrl(input: LatrSaveUrlInput) { return this.transport.request<LatrSaveResult>(LATR_XRPC.saveUrl, { input }); }
  saveSubject(input: LatrSaveSubjectInput) { return this.transport.request<LatrSaveResult>(LATR_XRPC.saveSubject, { input }); }
  setState(input: LatrSetStateInput) { return this.transport.request<LatrSimpleOk>(LATR_XRPC.setState, { input }); }
  deleteItem(input: LatrDeleteItemInput) { return this.transport.request<LatrSimpleOk>(LATR_XRPC.deleteItem, { input }); }
}
