/* Requisições do Financeiro Geral, mantendo o formato { success, body } da API. */
const root = `${import.meta.env.VITE_API_URL}/expenses`;
export const expenseCategories = ["Professores", "Aluguel", "Água", "Energia", "Internet", "Materiais", "Manutenção", "Impostos", "Outros"];
const request = async (path = "", method = "GET", data) => {
  const response = await fetch(`${root}${path}`, {
    method, headers: { "Content-Type": "application/json" },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {})
  });
  const result = await response.json();
  if (!response.ok || result?.success === false) {
    throw new Error(typeof result?.body === "string" ? result.body : result?.message || "Erro ao consultar despesas.");
  }
  return result?.body ?? result;
};
const expensesServices = {
  list: (reference) => request(`?${new URLSearchParams({ reference })}`),
  listRecurrences: () => request("/recurrences"),
  create: (data) => request("", "POST", data),
  update: (id, data) => request(`/${encodeURIComponent(id)}`, "PUT", data),
  pay: (id, data) => request(`/${encodeURIComponent(id)}/pay`, "POST", data),
  cancel: (id, reason) => request(`/${encodeURIComponent(id)}/cancel`, "POST", { reason }),
  zero: (id, reason) => request(`/${encodeURIComponent(id)}/zero`, "POST", { reason }),
  remove: (id) => request(`/${encodeURIComponent(id)}`, "DELETE"),
  createRecurrence: (data) => request("/recurrences", "POST", data),
  updateRecurrence: (id, data) => request(`/recurrences/${encodeURIComponent(id)}`, "PUT", data),
  stopRecurrence: (id) => request(`/recurrences/${encodeURIComponent(id)}/stop`, "POST")
};
export default expensesServices;
