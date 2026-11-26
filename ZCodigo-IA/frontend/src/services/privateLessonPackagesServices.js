/* EN: Read contracted packages without triggering financial or scheduling operations.
   PT: Consulta contratações sem disparar operações financeiras ou de agendamento. */
export function createPrivateLessonPackagesService({ base = import.meta.env?.VITE_API_URL ?? "", fetcher = globalThis.fetch } = {}) {
  const root = `${base.replace(/\/+$/, "")}/private-lesson-packages`;
  async function request(path = "", { signal } = {}) {
    const response = await fetcher(`${root}${path}`, { method: "GET", signal });
    let result;
    try { result = await response.json(); }
    catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new Error(`Resposta inválida do servidor (HTTP ${response.status}).`);
    }
    if (!response.ok || result?.success === false || result?.ok === false) {
      const message = [result?.body, result?.body?.message, result?.message, result?.serverError].find(v => typeof v === "string" && v);
      throw new Error(message || `Não foi possível consultar as contratações (HTTP ${response.status}).`);
    }
    return result?.body ?? result;
  }
  return {
    async list({ signal } = {}) {
      const rows = await request("", { signal });
      if (!Array.isArray(rows)) throw new Error("Lista de contratações inválida.");
      return rows;
    },
    async get(id, { signal } = {}) {
      if (typeof id !== "string" || !id.trim()) throw new Error("Identificador inválido.");
      const row = await request(`/${encodeURIComponent(id)}`, { signal });
      if (!row || typeof row !== "object" || Array.isArray(row) || row.id !== id) throw new Error("Contratação inválida.");
      return row;
    }
  };
}
export default createPrivateLessonPackagesService();
