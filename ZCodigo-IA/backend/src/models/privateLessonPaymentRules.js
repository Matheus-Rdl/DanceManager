import { isValidLessonAmount, isValidLessonDate, isValidLessonTimestamp } from "./privateLessonRules.js";

/* EN: Use integer cents for every calculation, never floating-point sums.
   PT: Usa centavos inteiros nos cálculos, nunca somas de ponto flutuante. */
export const paymentError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export const paymentId = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const paymentCents = value => {
  if (!isValidLessonAmount(value) || !Number.isSafeInteger(Math.round(value * 100)) || Math.round(value * 100) < 1) throw paymentError("Informe um valor positivo com até duas casas decimais.");
  return Math.round(value * 100);
};
const text = (value, max, required = false) => {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw paymentError("Forma de pagamento ou observações inválidas.");
  return value.trim();
};
export function brazilPaymentDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function paymentFields(body, today) {
  const allowed = ["requestId", "amount", "receivedAt", "method", "accountId", "notes"];
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw paymentError("Campos de pagamento inválidos.");
  if (!paymentId(body.requestId) || !paymentId(body.accountId)) throw paymentError("Identificador da operação ou conta inválido.");
  if (!isValidLessonDate(body.receivedAt) || !isValidLessonDate(today) || body.receivedAt > today) throw paymentError("Data de recebimento inválida ou futura.");
  return { requestId: body.requestId.toLowerCase(), amount: paymentCents(body.amount) / 100,
    receivedAt: body.receivedAt, method: text(body.method, 70, true), accountId: body.accountId.toLowerCase(), notes: text(body.notes === undefined ? "" : body.notes, 500) };
}
/* EN: Existing packages have no receipts field. Invalid stored ledgers must not silently become zero.
   PT: Pacotes antigos não possuem recebimentos. Dados gravados inválidos não podem virar zero silenciosamente. */
export function paymentSummary(pkg) {
  const fail = () => { throw paymentError("Histórico de pagamentos inconsistente.", 409); };
  let total;
  try { total = paymentCents(pkg.amount); } catch { fail(); }
  const payments = pkg.payments === undefined ? [] : pkg.payments;
  if (!Array.isArray(payments)) fail();
  let paid = 0;
  const ids = new Set(), requests = new Set();
  for (const item of payments) {
    if (!item || !paymentId(item.id) || !paymentId(item.requestId) || ids.has(item.id.toLowerCase()) || requests.has(item.requestId.toLowerCase())) fail();
    ids.add(item.id.toLowerCase()); requests.add(item.requestId.toLowerCase());
    try { paid += paymentCents(item.amount); } catch { fail(); }
    if (!Number.isSafeInteger(paid) || paid > total) fail();
  }
  return { contractedAmount: total / 100, paidAmount: paid / 100, outstandingAmount: (total - paid) / 100,
    paymentStatus: paid === 0 ? "pending" : paid === total ? "paid" : "partial", paymentCount: payments.length };
}
export const samePaymentRequest = (item, fields) => ["requestId", "amount", "receivedAt", "method", "accountId", "notes"].every(key => item[key] === fields[key]);
export const validStoredPaymentDate = isValidLessonDate;
export const validStoredPaymentTimestamp = isValidLessonTimestamp;
