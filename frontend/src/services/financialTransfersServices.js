import { financialAccountsRequest } from "./financialAccountsApi.js";

/* EN: Financial transfers are internal records, not actual bank transfers.
       The dialog will provide a stable idempotencyKey for each confirmed attempt.
   PT: Transferências são registros internos, não operações bancárias reais.
       O Dialog enviará uma idempotencyKey estável para cada tentativa confirmada. */
const financialTransfersServices = {
  list: (filters = {}, options = {}) =>
    financialAccountsRequest("/financial-transfers", { query: filters, ...options }),
  get: (id, options = {}) =>
    financialAccountsRequest(`/financial-transfers/${encodeURIComponent(id)}`, options),
  create: data => financialAccountsRequest("/financial-transfers", { method: "POST", data }),
  reverse: (id, data) => financialAccountsRequest(
    `/financial-transfers/${encodeURIComponent(id)}/reverse`, { method: "POST", data }
  )
};

export default financialTransfersServices;
