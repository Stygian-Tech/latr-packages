/** Gateway route for listing and mutating saved items. */
export const LATR_GATEWAY_SAVES_PATH = "/v1/latr/saves";

/** One-time migration from legacy `com.latr.*` repo collections. */
export const LATR_GATEWAY_MIGRATE_LEXICONS_PATH = "/v1/latr/migrate-lexicons";

export type LatrGatewayRepoRecord<T> = {
  uri: string;
  cid: string;
  value: T;
};

/** Response body for `GET /v1/latr/saves`. */
export type LatrGatewaySavedItemsResponse<T = Record<string, unknown>> = {
  records: LatrGatewayRepoRecord<T>[];
};

/** Response body for `POST /v1/latr/migrate-lexicons`. */
export type LatrGatewayLexiconMigrationResponse = {
  ok: true;
  externalCopied: number;
  itemsCopied: number;
  externalDeleted: number;
  itemsDeleted: number;
};
