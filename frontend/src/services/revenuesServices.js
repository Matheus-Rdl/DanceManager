/* Proventos manuais; lançamentos originados de eventos terão integração própria futuramente. */
const root = `${import.meta.env.VITE_API_URL}/revenues`;
export const revenueCategories = ["Vendas", "Serviços", "Inscrições", "Patrocínios", "Doações", "Eventos", "Outros"];
const request = async (path = "", method = "GET", data) => {
  const response = await fetch(`${root}${path}`, {
    method, headers: { "Content-Type": "application/json" },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {})
  });
  const result = await response.json();
  if (!response.ok || result?.success === false) {
    throw new Error(typeof result?.body === "string" ? result.body : result?.message || "Erro ao consultar proventos.");
  }
  return result?.body ?? result;
};
const revenuesServices = {
  list: (range = {}) => request(`?${new URLSearchParams(range)}`),
  create: data => request("", "POST", data),
  update: (id, data) => request(`/${encodeURIComponent(id)}`, "PUT", data),
  receive: (id, data) => request(`/${encodeURIComponent(id)}/receive`, "POST", data),
  cancel: (id, reason) => request(`/${encodeURIComponent(id)}/cancel`, "POST", { reason }),
  remove: id => request(`/${encodeURIComponent(id)}`, "DELETE")
};
export default revenuesServices;
