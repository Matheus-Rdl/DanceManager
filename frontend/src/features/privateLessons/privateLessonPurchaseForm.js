import { buildPlanPayload } from "../settings/privateLessonPlansView.js";

/* EN: Use a local calendar date, not UTC, for the contract date.
   PT: Usa a data local do calendário, e não UTC, para a contratação. */
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export const emptyPurchase = () => ({ participantIds: [], planId: "", name: "", lessonCount: "", amount: "", contractedOn: localDate(), notes: "" });
const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
const validId = id => typeof id === "string" && /^[a-f0-9]{24}$/.test(id);
export function filterParticipants(users, search, selected = []) {
  const term = normalize(search);
  const taken = new Set(selected);
  return users.filter(u => validId(u.id) && !taken.has(u.id) && (!term || [u.name,u.registration].some(v => normalize(v).includes(term))));
}
export function validContractDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  return y >= 1900 && y <= 2200 && date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d;
}
/* EN: Only send purchase fields; standard prices are resolved by the backend.
   PT: Envia apenas campos da contratação; preços padrões são resolvidos pelo backend. */
export function buildPurchasePayload(form, plans, users) {
  const ids = form.participantIds;
  const known = new Set(users.map(u => u.id));
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !validId(id) || !known.has(id))) throw new Error("Selecione participantes válidos, sem duplicações.");
  if (!validContractDate(form.contractedOn)) throw new Error("Informe uma data de contratação válida.");
  if (typeof form.notes !== "string" || form.notes.trim().length > 1000) throw new Error("Observações devem ter até 1000 caracteres.");
  const common = { participantIds: [...ids], contractedOn: form.contractedOn, notes: form.notes.trim() };
  if (form.planId === "custom") return { ...common, planId: null, ...buildPlanPayload(form) };
  if (!form.planId || !plans.some(p => p.id === form.planId && p.active === true)) throw new Error("Selecione um modelo ativo ou um pacote personalizado.");
  return { ...common, planId: form.planId };
}
export function purchasePreview(form, plans) {
  if (form.planId === "custom") {
    try { return buildPlanPayload({ ...form, name: "Personalizado" }); } catch { return null; }
  }
  return plans.find(p => p.id === form.planId && p.active === true) ?? null;
}
/* EN: Uncertain POST outcomes must be checked before any manual retry.
   PT: Resultados incertos de POST devem ser conferidos antes de uma nova tentativa. */
export const uncertainPurchase = err => ![400,403,404,409,422].includes(err?.status);
