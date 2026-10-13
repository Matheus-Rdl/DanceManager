import crypto from "crypto";
import mongoose from "mongoose";
import Payment from "../../models/Payment.js";
import MonthlyFee from "../../models/MonthlyFee.js";
import MonthlyFeesDataAccess from "../monthlyFees/monthlyFeesDataAccess.js";

export default class PaymentsDataAccess {
  /* Consulta os pagamentos e inclui os dados da mensalidade vinculada. */
  async getPayments(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.contractId) query.contractId = filters.contractId;
    if (filters.monthlyFeeId) query.monthlyFeeId = filters.monthlyFeeId;
    const payments = await Payment.find(query).sort({ paidAt: -1, createdAt: -1 }).lean();
    const ids = [...new Set(payments.map(item => item.monthlyFeeId).filter(Boolean))];
    const fees = await MonthlyFee.find({ id: { $in: ids } }).lean();
    const byId = new Map(fees.map(fee => [fee.id, fee]));
    return payments.map(payment => ({
      ...payment,
      monthlyFee: byId.get(payment.monthlyFeeId) || null
    }));
  }

  /* Registra o pagamento e atualiza a mensalidade na mesma transação. */
  async addPayment(feeId, paymentData = {}) {
    const amount = Number(paymentData.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor do pagamento inválido.");
    const paidAt = paymentData.paidAt || new Date().toISOString();
    if (Number.isNaN(Date.parse(paidAt))) throw new Error("Data do pagamento inválida.");
    if (!paymentData.method) throw new Error("Informe a forma de pagamento.");
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const fee = await MonthlyFee.findOne({ id: feeId }).session(session);
        if (!fee) throw new Error("Mensalidade não encontrada.");
        if (fee.status === "cancelled") throw new Error("Não é possível pagar uma mensalidade cancelada.");
        const remaining = Number((Number(fee.amount) - Number(fee.paidAmount || 0)).toFixed(2));
        if (remaining <= 0) throw new Error("Essa mensalidade já está quitada.");
        if (amount > remaining) throw new Error("O pagamento não pode ultrapassar o saldo.");
        const payment = new Payment({
          id: crypto.randomUUID(), monthlyFeeId: fee.id, contractId: fee.contractId,
          userId: fee.userId, amount, method: paymentData.method, paidAt,
          receipt: paymentData.receipt === true, createdAt: new Date().toISOString()
        });
        await payment.save({ session });
        fee.paidAmount = Number((Number(fee.paidAmount || 0) + amount).toFixed(2));
        fee.status = new MonthlyFeesDataAccess().getStatus(fee);
        await fee.save({ session });
        result = { payment: payment.toObject(), monthlyFee: fee.toObject() };
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}
