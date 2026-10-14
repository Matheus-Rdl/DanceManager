const root = `${import.meta.env.VITE_API_URL}/financial`;
const get = async (path, month) => {
  const response = await fetch(`${root}/${path}?${new URLSearchParams({ month })}`);
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(typeof data?.body === "string" ? data.body : "Erro ao consultar informações financeiras.");
  }
  return data?.body ?? data;
};
const financialServices = {
  getSummary: (month) => get("summary", month),
  getReceipts: (month) => get("receipts", month)
};
export default financialServices;
