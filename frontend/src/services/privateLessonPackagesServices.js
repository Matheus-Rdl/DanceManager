/* EN: Manage contracted packages without triggering financial or scheduling operations.
   PT: Gerencia contratações sem disparar operações financeiras ou de agendamento. */
export function createPrivateLessonPackagesService({ base = import.meta.env?.VITE_API_URL ?? "", fetcher = globalThis.fetch } = {}) {
  const root = `${base.replace(/\/+$/, "")}/private-lesson-packages`;
  async function request(path = "", { signal, method = "GET", data } = {}) {
    const response = await fetcher(`${root}${path}`, { method, signal, ...(data === undefined ? {} : {
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    }) });
    let result;
    try { result = await response.json(); }
    catch (error) {
      if (error?.name === "AbortError") throw error;
      throw new Error(`Resposta inválida do servidor (HTTP ${response.status}).`);
    }
    if (!response.ok || result?.success === false || result?.ok === false) {
      const message = [result?.body, result?.body?.message, result?.message, result?.serverError].find(v => typeof v === "string" && v);
      throw Object.assign(new Error(message || `Não foi possível processar a contratação (HTTP ${response.status}).`), { status: response.status });
    }
    return result?.body ?? result;
  }
  return {
    async list({ signal } = {}) {
      const rows = await request("", { signal });
      if (!Array.isArray(rows)) throw new Error("Lista de contratações inválida.");
      return rows;
    },
    async listParticipants({ signal } = {}) {
      const rows = await request("/participants", { signal });
      if (!Array.isArray(rows)) throw new Error("Lista de participantes inválida.");
      return rows;
    },
    async create(data) {
      const row = await request("", { method: "POST", data });
      if (!row || typeof row.id !== "string" || !row.id) throw new Error("Resposta da contratação inválida.");
      return row;
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
