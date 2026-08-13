export type LatrXrpcKind = "query" | "procedure";
export type LatrXrpcDescriptor = Readonly<{ nsid: string; kind: LatrXrpcKind; method: "GET" | "POST"; requiresApplicationCredential: boolean }>;
function descriptor(nsid: string, kind: LatrXrpcKind, requiresApplicationCredential = true): LatrXrpcDescriptor {
  return Object.freeze({ nsid, kind, method: kind === "query" ? "GET" : "POST", requiresApplicationCredential });
}
export const LATR_XRPC = Object.freeze({
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
export type LatrXrpcErrorName = "InvalidRequest" | "InvalidUrl" | "AuthRequired" | "InvalidToken" | "InvalidDpop" | "ClientAuthRequired" | "SavedItemNotFound" | "Conflict" | "RateLimitExceeded" | "UpstreamFailure";
export type LatrXrpcErrorBody = { error: LatrXrpcErrorName | "XrpcNotSupported"; message: string };
export type LatrRepoRecord<T> = { uri: string; cid: string; value: T };
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
  listItems<T>(parameters: LatrListItemsParams) { return this.transport.request<LatrListItemsOutput<T>>(LATR_XRPC.listItems, { params: parameters }); }
  getItem<T>(subjectUri: string) { return this.transport.request<{ record?: LatrRepoRecord<T> }>(LATR_XRPC.getItem, { params: { subjectUri } }); }
  saveUrl(input: LatrSaveUrlInput) { return this.transport.request<LatrSaveResult>(LATR_XRPC.saveUrl, { input }); }
  saveSubject(input: LatrSaveSubjectInput) { return this.transport.request<LatrSaveResult>(LATR_XRPC.saveSubject, { input }); }
  setState(input: LatrSetStateInput) { return this.transport.request<LatrSimpleOk>(LATR_XRPC.setState, { input }); }
  deleteItem(input: LatrDeleteItemInput) { return this.transport.request<LatrSimpleOk>(LATR_XRPC.deleteItem, { input }); }
}
