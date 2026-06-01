/** Gateway route for listing and mutating saved items. */
export const LATR_GATEWAY_SAVES_PATH = "/v1/latr/saves";

export type LatrGatewayRepoRecord<T> = {
  uri: string;
  cid: string;
  value: T;
};

/** Response body for `GET /v1/latr/saves`. */
export type LatrGatewaySavedItemsResponse<T = Record<string, unknown>> = {
  records: LatrGatewayRepoRecord<T>[];
};
