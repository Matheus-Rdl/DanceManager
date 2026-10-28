const ROOT = `${import.meta.env.VITE_API_URL}/plans`;
async function request(path = "", options = {}) {
  const res = await fetch(`${ROOT}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const data = await res.json();
  if (!res.ok || data?.success === false) throw new Error(typeof data.body === "string" ? data.body : data?.message || "Não foi possível acessar os planos.");
  return data?.body ?? data;
}
export const listPlans = () => request();
export const addPlan = body => request("", { method: "POST", body: JSON.stringify(body) });
export const updatePlan = (id, body) => request(`/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
