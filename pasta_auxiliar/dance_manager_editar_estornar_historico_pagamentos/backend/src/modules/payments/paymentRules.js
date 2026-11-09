/* Pure payment rules, shared by edit and reversal validations.
   Regras de pagamento sem acesso ao banco, reutilizadas pela edição e estorno. */
export const PAYMENT_ACTIVE = { status: { $ne: "reversed" } }; // Legacy payments have no status.

export const paymentCents = (value) => Math.round(Number(value) * 100);

export const sumActivePaymentCents = (payments) => payments
  .filter(payment => payment.status !== "reversed")
  .reduce((total, payment) => total + paymentCents(payment.amount), 0);

export const paymentSnapshot = payment => ({
  amount: payment.amount,
  paidAt: payment.paidAt,
  method: payment.method,
  receipt: payment.receipt === true,
  status: payment.status || "confirmed"
});

export const validatePaymentChange = (body, { edit = false } = {}) => {
  const reason = String(body?.reason || "").trim();
  if (reason.length < 10 || reason.length > 1000) {
    throw Object.assign(new Error("Informe uma justificativa de 10 a 1000 caracteres."), { statusCode: 400 });
  }
  if (!edit) return { reason };
  const amount = Number(body?.amount);
  if (typeof body?.amount === "boolean" || body?.amount === "" || !Number.isFinite(amount) || paymentCents(amount) <= 0 || Math.abs(paymentCents(amount) / 100 - amount) > 0.0000001) {
    throw Object.assign(new Error("Informe um valor positivo com no máximo duas casas decimais."), { statusCode: 400 });
  }
  const method = String(body?.method || "").trim();
  if (!method || method.length > 80) {
    throw Object.assign(new Error("Informe uma forma de pagamento válida."), { statusCode: 400 });
  }
  const raw = String(body?.paidAt || "").trim();
  const date = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00.000Z`)) ||
      new Date(`${date}T12:00:00.000Z`).toISOString().slice(0, 10) !== date ||
      (raw.length > 10 && (Number.isNaN(Date.parse(raw)) || !/^\d{4}-\d{2}-\d{2}T/.test(raw)))) {
    throw Object.assign(new Error("Data do pagamento inválida."), { statusCode: 400 });
  }
  return { reason, amount: paymentCents(amount) / 100, method, paidAt: `${date}T12:00:00.000Z`, receipt: body?.receipt === true };
};
