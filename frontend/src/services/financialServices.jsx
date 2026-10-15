const root = `${import.meta.env.VITE_API_URL}/financial`;

/* Serviços sem hooks: podem ser utilizados independentemente por cada aba. */
const get = async (path, filters) => {
  const query = typeof filters === "string" ? { month: filters } : filters || {};
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value != null && value !== ""));
  const response = await fetch(`${root}/${path}?${params}`);
  const result = await response.json();
  if (!response.ok || result?.success === false) {
    throw new Error(typeof result?.body === "string" ? result.body : result?.message || "Erro ao consultar o financeiro.");
  }
  return result?.body ?? result;
};
const financialServices = {
  getSummary: month => get("summary", month),
  getPeriodSummary: range => get("period-summary", range),
  getReceipts: range => get("receipts", range),
  getTimeline: options => get("timeline", options)
};
export default financialServices;
