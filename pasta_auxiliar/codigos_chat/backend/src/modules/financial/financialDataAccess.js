import Payment from "../../models/Payment.js";
import MonthlyFee from "../../models/MonthlyFee.js";
import Expense from "../../models/Expense.js";
import User from "../../models/User.js";
import { ensureAllExpenses } from "../expenses/expenseGeneration.js";
import { schoolId, monthNow, isMonth, addMonths } from "../expenses/expenseRules.js";
import { todayInBrazil } from "../monthlyFees/monthlyFeeGeneration.js";

const sum = (items, field) => Math.round(items.reduce((acc, item) => acc + Number(item[field] || 0), 0) * 100) / 100;
const between = (field, from, to) => ({ [field]: { $gte: from, $lt: to } });
const status = fee => {
  if (fee.status === "cancelled") return "cancelled";
  if (Number(fee.paidAmount || 0) >= Number(fee.amount || 0)) return "paid";
  if (fee.dueDate < todayInBrazil()) return "overdue";
  return "pending";
};
const resolveMonth = month => {
  if (!month) return monthNow();
  if (!isMonth(month)) throw Object.assign(new Error("Competência inválida."), { statusCode: 400 });
  return month;
};

/* Acesso e agregação aos dados financeiros; nenhuma resposta HTTP nesta camada. */
export default class FinancialDataAccess {
  async getSummary(filters = {}) {
    const month = resolveMonth(filters.month);
    await ensureAllExpenses();
    const startChart = addMonths(month, -5);
    const end = addMonths(month, 1);
    const [payments, paidExpenses, fees, dueExpenses] = await Promise.all([
      Payment.find(between("paidAt", startChart, end)).select("amount paidAt").lean(),
      Expense.find({ schoolId: schoolId(), status: "paid", ...between("paidAt", startChart, end) }).select("paidAmount paidAt").lean(),
      MonthlyFee.find({ reference: month, status: { $ne: "cancelled" } }).select("amount paidAmount dueDate status").lean(),
      Expense.find({ schoolId: schoolId(), reference: month, status: { $nin: ["cancelled", "zeroed"] } }).select("amount paidAmount status dueDate").lean()
    ]);
    const paidInMonth = payments.filter(p => p.paidAt.slice(0, 7) === month);
    const expensesPaidInMonth = paidExpenses.filter(e => e.paidAt.slice(0, 7) === month);
    const feesOverdue = fees.filter(f => status(f) === "overdue");
    const pendingExpenses = dueExpenses.filter(e => e.status === "pending");
    const timeline = Array.from({ length: 6 }, (_, i) => {
      const reference = addMonths(startChart, i);
      const received = sum(payments.filter(p => p.paidAt.slice(0, 7) === reference), "amount");
      const expensesPaid = sum(paidExpenses.filter(e => e.paidAt.slice(0, 7) === reference), "paidAmount");
      return { reference, received, expensesPaid, result: Math.round((received - expensesPaid) * 100) / 100 };
    });
    const received = sum(paidInMonth, "amount");
    const expensesPaid = sum(expensesPaidInMonth, "paidAmount");
    return {
      month, received, expensesPaid, result: Math.round((received - expensesPaid) * 100) / 100,
      expectedFees: sum(fees, "amount"),
      openFees: Math.round(fees.reduce((acc, f) => acc + Math.max(0, Number(f.amount) - Number(f.paidAmount || 0)), 0) * 100) / 100,
      overdueFeesCount: feesOverdue.length,
      overdueFeesValue: Math.round(feesOverdue.reduce((acc, f) => acc + Math.max(0, Number(f.amount) - Number(f.paidAmount || 0)), 0) * 100) / 100,
      pendingExpensesCount: pendingExpenses.length,
      pendingExpensesValue: sum(pendingExpenses, "amount"),
      timeline
    };
  }

  /* Série flexível para o gráfico; agrupa no MongoDB por mês do pagamento efetivo. */
  async getTimeline(filters = {}) {
    const mode = String(filters.mode || "6");
    if (!["6", "12", "year", "month"].includes(mode)) {
      throw Object.assign(new Error("Período do gráfico inválido."), { statusCode: 400 });
    }
    const month = resolveMonth(filters.month);
    const year = String(filters.year || month.slice(0, 4));
    if (!/^(19|20|21)\d{2}$/.test(year)) {
      throw Object.assign(new Error("Ano inválido."), { statusCode: 400 });
    }
    const count = mode === "12" || mode === "year" ? 12 : mode === "6" ? 6 : 1;
    const firstMonth = mode === "year" ? `${year}-01` : addMonths(month, 1 - count);
    const finalExclusive = addMonths(firstMonth, count);
    const matchPayments = between("paidAt", firstMonth, finalExclusive);
    const matchExpenses = { schoolId: schoolId(), status: "paid", ...between("paidAt", firstMonth, finalExclusive) };

    /* Os timestamps são strings ISO (YYYY-MM-DD...). Não utilizar a data de vencimento. */
    const [incoming, outgoing] = await Promise.all([
      Payment.aggregate([
        { $match: matchPayments },
        { $group: { _id: { $substrBytes: ["$paidAt", 0, 7] }, total: { $sum: "$amount" } } }
      ]),
      Expense.aggregate([
        { $match: matchExpenses },
        { $group: { _id: { $substrBytes: ["$paidAt", 0, 7] }, total: { $sum: "$paidAmount" } } }
      ])
    ]);
    const byIncoming = new Map(incoming.map(item => [item._id, Number(item.total) || 0]));
    const byOutgoing = new Map(outgoing.map(item => [item._id, Number(item.total) || 0]));
    const round = value => Math.round(value * 100) / 100;
    const timeline = Array.from({ length: count }, (_, index) => {
      const reference = addMonths(firstMonth, index);
      const received = round(byIncoming.get(reference) || 0);
      const expensesPaid = round(byOutgoing.get(reference) || 0);
      return { reference, received, expensesPaid, result: round(received - expensesPaid) };
    });
    const received = round(timeline.reduce((total, item) => total + item.received, 0));
    const expensesPaid = round(timeline.reduce((total, item) => total + item.expensesPaid, 0));
    return {
      mode, month, year, from: firstMonth, to: addMonths(finalExclusive, -1), timeline,
      totals: { received, expensesPaid, result: round(received - expensesPaid) }
    };
  }

  async getReceipts(filters = {}) {
    const month = resolveMonth(filters.month);
    const payments = await Payment.find(between("paidAt", month, addMonths(month, 1)))
      .sort({ paidAt: -1, createdAt: -1 }).lean();
    const monthlyFeeIds = [...new Set(payments.map(p => p.monthlyFeeId).filter(Boolean))];
    const userIds = [...new Set(payments.map(p => p.userId).filter(Boolean))];
    const [fees, users] = await Promise.all([
      MonthlyFee.find({ id: { $in: monthlyFeeIds } }).select("id reference dueDate amount").lean(),
      User.find({ _id: { $in: userIds.filter(id => /^[\da-f]{24}$/i.test(String(id))) } }).select("user_name user_mat").lean()
    ]);
    const byFee = new Map(fees.map(f => [f.id, f]));
    const byUser = new Map(users.map(u => [String(u._id), u]));
    return payments.map(p => ({
      ...p,
      monthlyFee: byFee.get(p.monthlyFeeId) || null,
      student: { name: byUser.get(p.userId)?.user_name || "Aluno não encontrado", mat: byUser.get(p.userId)?.user_mat || "" }
    }));
  }
}
