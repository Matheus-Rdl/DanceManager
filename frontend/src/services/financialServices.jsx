const root = `${import.meta.env.VITE_API_URL}/financial`;

/* Mantém o mesmo formato de resposta de summary/receipts e aceita filtros adicionais. */
const get = async (path, filters) => {
  const query = typeof filters === "string" ? { month: filters } : filters || {};
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value != null && value !== ""));
  const response = await fetch(`${root}/${path}?${params}`);
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(typeof data?.body === "string" ? data.body : "Erro ao consultar informações financeiras.");
  }
  return data?.body ?? data;
};

const financialServices = {
  getSummary: month => get("summary", month),
  getReceipts: month => get("receipts", month),
  getTimeline: filters => get("timeline", filters)
};
export default financialServices;
