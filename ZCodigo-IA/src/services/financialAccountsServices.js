import { financialAccountsRequest } from "./financialAccountsApi.js";

/* EN: Fetch account registration data and calculated balances separately.
       Opening balances are not edited through the normal update endpoint.
   PT: Consulta os cadastros e os saldos calculados separadamente.
       O saldo inicial não é editado pela rota administrativa comum. */
const financialAccountsServices = {
  list: (filters = {}, options = {}) =>
    financialAccountsRequest("/financial-accounts", { query: filters, ...options }),
  get: (id, options = {}) =>
    financialAccountsRequest(`/financial-accounts/${encodeURIComponent(id)}`, options),
  getBalances: (filters = {}, options = {}) =>
    financialAccountsRequest("/financial-accounts/balances", { query: filters, ...options }),
  create: data => financialAccountsRequest("/financial-accounts", { method: "POST", data }),
  update: (id, data) => financialAccountsRequest(
    `/financial-accounts/${encodeURIComponent(id)}`, { method: "PATCH", data }
  )
};

export default financialAccountsServices;
