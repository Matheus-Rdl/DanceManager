import { validateCancellationPreview, validateCancellationResult } from "../features/privateLessons/privateLessonCancellationView.js";
import { validateLessonList, validateScheduleResult, validOperation } from "../features/privateLessons/privateLessonSchedulingView.js";
import { validatePaymentHistory } from "../features/privateLessons/privateLessonFinancialView.js";
import { validatePaymentSummary, paymentMatches, uuid } from "../features/privateLessons/privateLessonPaymentForm.js";

/* EN: Manage purchases and integrated receipts.
   PT: Gerencia contratações e recebimentos integrados. */
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
      throw Object.assign(new Error(message || `Não foi possível processar a contratação (HTTP ${response.status}).`), { status: response.status, code: result?.code, conflicts: result?.conflicts });
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
    async previewCancellation(id, { signal } = {}) {
      if (!uuid(id)) throw new Error("Identificador inválido.");
      return validateCancellationPreview(await request(`/${encodeURIComponent(id)}/cancellation-preview`, { signal }), id);
    },
    async cancelPackage(id, data) {
      if (!uuid(id)) throw new Error("Identificador inválido.");
      return validateCancellationResult(await request(`/${encodeURIComponent(id)}/cancel`, { method: "POST", data }), id, data);
    },
    async getLessons(id, { signal } = {}) {
      if (!uuid(id)) throw new Error("Identificador inválido.");
      return validateLessonList(await request(`/${encodeURIComponent(id)}/lessons`, { signal }), id);
    },
    async mutateLesson(id, op) {
      if (!uuid(id) || !validOperation(op)) throw new Error("Operação de agenda inválida.");
      const root = `/${encodeURIComponent(id)}/lessons`;
      const path = op.kind === "single" ? root : op.kind === "recurring" ? `${root}/recurring` : `${root}/${encodeURIComponent(op.lessonId)}/${op.kind === "status" ? "status" : "reschedule"}`;
      return validateScheduleResult(await request(path, { method: op.kind === "status" ? "PATCH" : "POST", data: op.data }), id, op);
    },
    async getPayments(id, { signal } = {}) {
      if (!uuid(id)) throw new Error("Identificador inválido.");
      const row = await request(`/${encodeURIComponent(id)}/payments`, { signal });
      if (row?.packageId !== id || !Array.isArray(row.payments) || row.paymentCount !== row.payments.length) throw new Error("Resposta financeira inválida.");
      return validatePaymentHistory(row);
    },
    async receivePayment(id, data) {
      if (!uuid(id)) throw new Error("Identificador inválido.");
      const row = await request(`/${encodeURIComponent(id)}/payments`, { method: "POST", data });
      if (row?.packageId !== id || !uuid(row.payment?.id) || row.revenueId !== row.payment.id || !paymentMatches(row.payment, data)) throw new Error("Recebimento não confirmado pelo servidor.");
      validatePaymentSummary(row.summary);
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
