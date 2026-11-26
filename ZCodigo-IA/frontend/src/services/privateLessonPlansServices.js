/* EN: Keep private lesson models independent from monthly fee plans.
   PT: Mantém os modelos de aulas particulares separados dos planos de mensalidades. */
export function createPrivateLessonPlansService({ base = import.meta.env?.VITE_API_URL ?? "", fetcher = globalThis.fetch } = {}) {
  const root = `${base.replace(/\/+$/, "")}/private-lesson-plans`;
  async function request(path = "", { method = "GET", data, signal } = {}) {
    const response = await fetcher(`${root}${path}`, {
      method, signal, ...(data === undefined ? {} : {
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
      })
    });
    let result;
    try { result = await response.json(); }
    catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new Error(`Resposta inválida do servidor (HTTP ${response.status}).`);
    }
    if (!response.ok || result?.success === false || result?.ok === false) {
      const message = [result?.body, result?.body?.message, result?.message, result?.serverError].find(v => typeof v === "string" && v);
      throw new Error(message || `Não foi possível consultar os pacotes (HTTP ${response.status}).`);
    }
    return result?.body ?? result;
  }
  return {
    async list({ active, signal } = {}) {
      const rows = await request(typeof active === "boolean" ? `?active=${active}` : "", { signal });
      if (!Array.isArray(rows)) throw new Error("Lista de pacotes inválida.");
      return rows;
    },
    create: data => request("", { method: "POST", data }),
    update: (id, data) => request(`/${encodeURIComponent(id)}`, { method: "PATCH", data })
  };
}
export default createPrivateLessonPlansService();
