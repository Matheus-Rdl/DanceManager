import crypto from "crypto";
import mongoose from "mongoose";
import Payment from "../../models/Payment.js";
import MonthlyFee from "../../models/MonthlyFee.js";
import MonthlyFeesDataAccess from "../monthlyFees/monthlyFeesDataAccess.js";
import { PAYMENT_ACTIVE, paymentCents, sumActivePaymentCents, paymentSnapshot, validatePaymentChange } from "./paymentRules.js";

const paymentError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

export default class PaymentsDataAccess {
  /* Return active and reversed records, always preserving their audit trail.
     Retorna pagamentos válidos e estornados, com o histórico de alterações. */
  async getPayments(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.contractId) query.contractId = filters.contractId;
    if (filters.monthlyFeeId) query.monthlyFeeId = filters.monthlyFeeId;
    const payments = await Payment.find(query).sort({ paidAt: -1, createdAt: -1 }).lean();
    const ids = [...new Set(payments.map(item => item.monthlyFeeId).filter(Boolean))];
    const fees = await MonthlyFee.find({ id: { $in: ids } }).lean();
    const byId = new Map(fees.map(fee => [fee.id, fee]));
    return payments.map(payment => ({ ...payment, status: payment.status || "confirmed", monthlyFee: byId.get(payment.monthlyFeeId) || null }));
  }

  /* Add one payment and update its installment in the same transaction.
     Registra o pagamento e a mensalidade na mesma transação. */
  async addPayment(feeId, paymentData = {}) {
    const amount = Number(paymentData.amount);
    if (!Number.isFinite(amount) || paymentCents(amount) <= 0 || Math.abs(paymentCents(amount) / 100 - amount) > 0.0000001) throw paymentError("Valor do pagamento inválido.");
    const paidAt = paymentData.paidAt || new Date().toISOString();
    if (Number.isNaN(Date.parse(paidAt))) throw paymentError("Data do pagamento inválida.");
    if (!paymentData.method) throw paymentError("Informe a forma de pagamento.");
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const fee = await MonthlyFee.findOne({ id: feeId }).session(session);
        if (!fee) throw paymentError("Mensalidade não encontrada.", 404);
        if (fee.status === "cancelled") throw paymentError("Não é possível pagar uma mensalidade cancelada.");
        const remaining = paymentCents(fee.amount) - paymentCents(fee.paidAmount || 0);
        if (remaining <= 0) throw paymentError("Essa mensalidade já está quitada.");
        if (paymentCents(amount) > remaining) throw paymentError("O pagamento não pode ultrapassar o saldo.");
        const payment = new Payment({
          id: crypto.randomUUID(), monthlyFeeId: fee.id, contractId: fee.contractId,
          userId: fee.userId, amount: paymentCents(amount) / 100, method: paymentData.method,
          paidAt, receipt: paymentData.receipt === true, createdAt: new Date().toISOString(), status: "confirmed"
        });
        await payment.save({ session });
        fee.paidAmount = (paymentCents(fee.paidAmount || 0) + paymentCents(amount)) / 100;
        fee.status = new MonthlyFeesDataAccess().getStatus(fee);
        await fee.save({ session });
        result = { payment: payment.toObject(), monthlyFee: fee.toObject() };
      });
      return result;
    } finally { await session.endSession(); }
  }

  /* Correct or reverse only one payment; recompute the fee from active records.
     Corrige ou estorna um pagamento, recalculando o total pelos registros válidos. */
  async changePayment(paymentId, body = {}, action = "edited") {
    if (!paymentId || !["edited", "reversed"].includes(action)) throw paymentError("Operação de pagamento inválida.");
    const changed = validatePaymentChange(body, { edit: action === "edited" });
    const actor = null;
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const payment = await Payment.findOne({ id: paymentId }).session(session);
        if (!payment) throw paymentError("Pagamento não encontrado.", 404);
        if (payment.status === "reversed") throw paymentError("Pagamento já estornado. Não pode ser alterado novamente.", 409);
        const fee = await MonthlyFee.findOne({ id: payment.monthlyFeeId }).session(session);
        if (!fee) throw paymentError("Mensalidade vinculada não encontrada.", 404);
        const before = paymentSnapshot(payment);
        const at = new Date().toISOString();
        if (action === "edited") {
          if (fee.status === "cancelled") throw paymentError("Não é possível editar pagamento de mensalidade cancelada.", 409);
          if (before.amount === changed.amount && before.paidAt.slice(0, 10) === changed.paidAt.slice(0, 10) && before.method === changed.method && before.receipt === changed.receipt) {
            throw paymentError("Nenhuma informação foi alterada.");
          }
          payment.amount = changed.amount;
          payment.method = changed.method;
          payment.paidAt = changed.paidAt;
          payment.receipt = changed.receipt;
        } else {
          payment.status = "reversed";
          payment.reversedAt = at;
          payment.reversalReason = changed.reason;
          payment.reversedBy = actor;
        }
        const otherPayments = await Payment.find({ monthlyFeeId: fee.id, ...PAYMENT_ACTIVE }).session(session).lean();
        // The current unsaved Mongoose document must replace its persisted counterpart.
        // O documento editado, ainda não salvo, substitui sua versão anterior na soma.
        const active = otherPayments.filter(item => item.id !== payment.id);
        if (action === "edited") active.push(payment);
        const cents = sumActivePaymentCents(active);
        if (cents > paymentCents(fee.amount)) throw paymentError("O total recebido não pode ultrapassar o valor da mensalidade.");
        const after = paymentSnapshot(payment);
        payment.updatedAt = at;
        payment.auditHistory.push({ action, at, reason: changed.reason, actor, before, after });
        fee.paidAmount = cents / 100;
        fee.status = new MonthlyFeesDataAccess().getStatus(fee);
        await payment.save({ session });
        await fee.save({ session });
        result = { payment: payment.toObject(), monthlyFee: fee.toObject() };
      });
      return result;
    } finally { await session.endSession(); }
  }
}
