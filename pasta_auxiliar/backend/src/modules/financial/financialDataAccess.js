import Payment from "../../models/Payment.js";
import MonthlyFee from "../../models/MonthlyFee.js";
import Expense from "../../models/Expense.js";
import Revenue from "../../models/Revenue.js";
import User from "../../models/User.js";
import { ensureAllExpenses } from "../expenses/expenseGeneration.js";
import { schoolId, monthNow, isMonth, addMonths } from "../expenses/expenseRules.js";
import { todayInBrazil } from "../monthlyFees/monthlyFeeGeneration.js";
import { isDate } from "../expenses/expenseRules.js";
import { buildFinancialMovements } from "./financialMovements.js";

const activePayments = { status: { $ne: "reversed" } }; // Keep legacy records without status.
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

/* Intervalo inclusivo YYYY-MM: compatível com datas ISO armazenadas como texto. */
const resolveRange = filters => {
  if (filters.from == null && filters.to == null) {
    const month = resolveMonth(filters.month);
    return { from: month, to: month, after: addMonths(month, 1) };
  }
  const { from, to } = filters;
  if (!isMonth(from) || !isMonth(to) || from > to) {
    throw Object.assign(new Error("Intervalo financeiro inválido."), { statusCode: 400 });
  }
  const yearDelta = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12;
  const months = yearDelta + Number(to.slice(5)) - Number(from.slice(5)) + 1;
  if (months > 12) throw Object.assign(new Error("Selecione um período de até 12 meses."), { statusCode: 400 });
  return { from, to, after: addMonths(to, 1) };
};
const round = value => Math.round(value * 100) / 100;

/* Acesso e agregação aos dados financeiros; nenhuma resposta HTTP nesta camada. */
export default class FinancialDataAccess {
  async getSummary(filters = {}) {
    const month = resolveMonth(filters.month);
    await ensureAllExpenses();
    const startChart = addMonths(month, -5);
    const end = addMonths(month, 1);
    const [payments, paidExpenses, fees, dueExpenses, receivedRevenues, dueRevenues] = await Promise.all([
      Payment.find({ ...activePayments, ...between("paidAt", startChart, end) }).select("amount paidAt").lean(),
      Expense.find({ schoolId: schoolId(), status: "paid", ...between("paidAt", startChart, end) }).select("paidAmount paidAt").lean(),
      MonthlyFee.find({ reference: month, status: { $ne: "cancelled" } }).select("amount paidAmount dueDate status").lean(),
      Expense.find({ schoolId: schoolId(), reference: month, status: { $nin: ["cancelled", "zeroed"] } }).select("amount paidAmount status dueDate").lean(),
      Revenue.find({ schoolId: schoolId(), status: "received", ...between("receivedAt", startChart, end) }).select("receivedAmount receivedAt").lean(),
      Revenue.find({ schoolId: schoolId(), reference: month, status: "pending" }).select("amount dueDate").lean()
    ]);
    const paidInMonth = payments.filter(p => p.paidAt.slice(0, 7) === month);
    const expensesPaidInMonth = paidExpenses.filter(e => e.paidAt.slice(0, 7) === month);
    const revenuesInMonth = receivedRevenues.filter(r => r.receivedAt.slice(0, 7) === month);
    const feesOverdue = fees.filter(f => status(f) === "overdue");
    const pendingExpenses = dueExpenses.filter(e => e.status === "pending");
    const timeline = Array.from({ length: 6 }, (_, i) => {
      const reference = addMonths(startChart, i);
      const monthlyFeesReceived = sum(payments.filter(p => p.paidAt.slice(0, 7) === reference), "amount");
      const otherRevenuesReceived = sum(receivedRevenues.filter(r => r.receivedAt.slice(0, 7) === reference), "receivedAmount");
      const received = round(monthlyFeesReceived + otherRevenuesReceived);
      const expensesPaid = sum(paidExpenses.filter(e => e.paidAt.slice(0, 7) === reference), "paidAmount");
      return { reference, received, expensesPaid, result: Math.round((received - expensesPaid) * 100) / 100 };
    });
    const monthlyFeesReceived = sum(paidInMonth, "amount");
    const otherRevenuesReceived = sum(revenuesInMonth, "receivedAmount");
    const received = round(monthlyFeesReceived + otherRevenuesReceived);
    const expensesPaid = sum(expensesPaidInMonth, "paidAmount");
    return {
      month, received, monthlyFeesReceived, otherRevenuesReceived, expensesPaid, result: Math.round((received - expensesPaid) * 100) / 100,
      expectedFees: sum(fees, "amount"),
      openFees: Math.round(fees.reduce((acc, f) => acc + Math.max(0, Number(f.amount) - Number(f.paidAmount || 0)), 0) * 100) / 100,
      overdueFeesCount: feesOverdue.length,
      overdueFeesValue: Math.round(feesOverdue.reduce((acc, f) => acc + Math.max(0, Number(f.amount) - Number(f.paidAmount || 0)), 0) * 100) / 100,
      pendingExpensesCount: pendingExpenses.length,
      pendingExpensesValue: sum(pendingExpenses, "amount"),
      pendingRevenuesCount: dueRevenues.length, pendingRevenuesValue: sum(dueRevenues, "amount"),
      overdueRevenuesCount: dueRevenues.filter(r => r.dueDate < todayInBrazil()).length,
      timeline
    };
  }

  /* Resumo por período. Realizados: paidAt; previstos: referência da cobrança/despesa. */
  async getPeriodSummary(filters = {}) {
    const { from, to, after } = resolveRange(filters);
    await ensureAllExpenses();
    const [paid, outgoing, fees, dueExpenses, otherReceived, dueRevenues] = await Promise.all([
      Payment.aggregate([
        { $match: { ...activePayments, ...between("paidAt", from, after) } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      /* Uma única agregação calcula despesas realizadas e sua distribuição por categoria.
         A data usada é a de pagamento, nunca a competência/vencimento. */
      Expense.aggregate([
        { $match: { schoolId: schoolId(), status: "paid", ...between("paidAt", from, after) } },
        { $group: { _id: "$category", total: { $sum: "$paidAmount" } } }
      ]),
      MonthlyFee.find({ reference: { $gte: from, $lte: to }, status: { $ne: "cancelled" } })
        .select("amount paidAmount dueDate status").lean(),
      Expense.find({ schoolId: schoolId(), reference: { $gte: from, $lte: to }, status: { $nin: ["cancelled", "zeroed"] } })
        .select("amount status dueDate").lean(),
      Revenue.aggregate([
        { $match: { schoolId: schoolId(), status: "received", ...between("receivedAt", from, after) } },
        { $group: { _id: null, total: { $sum: "$receivedAmount" } } }
      ]),
      Revenue.find({ schoolId: schoolId(), reference: { $gte: from, $lte: to }, status: "pending" })
        .select("amount dueDate").lean()
    ]);
    const monthlyFeesReceived = round(Number(paid[0]?.total || 0));
    const otherRevenuesReceived = round(Number(otherReceived[0]?.total || 0));
    const received = round(monthlyFeesReceived + otherRevenuesReceived);
    /* Consolida categorias com nomes vazios/legados e preserva todos os valores pagos. */
    const categoryTotals = new Map();
    for (const item of outgoing) {
      const category = String(item._id || "Outros").trim() || "Outros";
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + Number(item.total || 0));
    }
    const expenseCategories = [...categoryTotals].map(([category, amount]) => ({ category, amount: round(amount) }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, "pt-BR"));
    const expensesPaid = round(outgoing.reduce((total, item) => total + Number(item.total || 0), 0));
    const overdueFees = fees.filter(fee => status(fee) === "overdue");
    const pendingExpenses = dueExpenses.filter(item => item.status === "pending");
    return {
      from, to, received, monthlyFeesReceived, otherRevenuesReceived, expensesPaid, result: round(received - expensesPaid),
      expenseCategories,
      expectedFees: sum(fees, "amount"),
      openFees: round(fees.reduce((total, f) => total + Math.max(Number(f.amount || 0) - Number(f.paidAmount || 0), 0), 0)),
      overdueFeesCount: overdueFees.length,
      overdueFeesValue: round(overdueFees.reduce((total, f) => total + Math.max(Number(f.amount || 0) - Number(f.paidAmount || 0), 0), 0)),
      pendingExpensesCount: pendingExpenses.length,
      pendingExpensesValue: sum(pendingExpenses, "amount"),
      pendingRevenuesCount: dueRevenues.length, pendingRevenuesValue: sum(dueRevenues, "amount"),
      overdueRevenuesCount: dueRevenues.filter(r => r.dueDate < todayInBrazil()).length
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
    const matchPayments = { ...activePayments, ...between("paidAt", firstMonth, finalExclusive) };
    const matchExpenses = { schoolId: schoolId(), status: "paid", ...between("paidAt", firstMonth, finalExclusive) };

    /* Os timestamps são strings ISO (YYYY-MM-DD...). Não utilizar a data de vencimento. */
    const [incoming, outgoing, otherIncoming] = await Promise.all([
      Payment.aggregate([
        { $match: matchPayments },
        { $group: { _id: { $substrBytes: ["$paidAt", 0, 7] }, total: { $sum: "$amount" } } }
      ]),
      Expense.aggregate([
        { $match: matchExpenses },
        { $group: { _id: { $substrBytes: ["$paidAt", 0, 7] }, total: { $sum: "$paidAmount" } } }
      ]),
      Revenue.aggregate([
        { $match: { schoolId: schoolId(), status: "received", ...between("receivedAt", firstMonth, finalExclusive) } },
        { $group: { _id: { $substrBytes: ["$receivedAt", 0, 7] }, total: { $sum: "$receivedAmount" } } }
      ])
    ]);
    const byIncoming = new Map(incoming.map(item => [item._id, Number(item.total) || 0]));
    const byOutgoing = new Map(outgoing.map(item => [item._id, Number(item.total) || 0]));
    const byOtherIncoming = new Map(otherIncoming.map(item => [item._id, Number(item.total) || 0]));
    const round = value => Math.round(value * 100) / 100;
    const timeline = Array.from({ length: count }, (_, index) => {
      const reference = addMonths(firstMonth, index);
      const monthlyFeesReceived = round(byIncoming.get(reference) || 0);
      const otherRevenuesReceived = round(byOtherIncoming.get(reference) || 0);
      const received = round(monthlyFeesReceived + otherRevenuesReceived);
      const expensesPaid = round(byOutgoing.get(reference) || 0);
      return { reference, received, monthlyFeesReceived, otherRevenuesReceived, expensesPaid, result: round(received - expensesPaid) };
    });
    const received = round(timeline.reduce((total, item) => total + item.received, 0));
    const monthlyFeesReceived = round(timeline.reduce((total, item) => total + item.monthlyFeesReceived, 0));
    const otherRevenuesReceived = round(timeline.reduce((total, item) => total + item.otherRevenuesReceived, 0));
    const expensesPaid = round(timeline.reduce((total, item) => total + item.expensesPaid, 0));
    return {
      mode, month, year, from: firstMonth, to: addMonths(finalExclusive, -1), timeline,
      totals: { received, monthlyFeesReceived, otherRevenuesReceived, expensesPaid, result: round(received - expensesPaid) }
    };
  }

  /* Realized movements only, grouped by original record, selected by the actual payment date.
     Somente dinheiro movimentado, agrupado por lançamento e filtrado pela data real. */
  async getMovements(filters = {}) {
    const { from, to, after } = resolveRange(filters);
    if (filters.startDate && !isDate(filters.startDate)) {
      throw Object.assign(new Error("Data inicial inválida."), { statusCode: 400 });
    }
    if (filters.endDate && !isDate(filters.endDate)) {
      throw Object.assign(new Error("Data final inválida."), { statusCode: 400 });
    }
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw Object.assign(new Error("A data inicial não pode ser posterior à final."), { statusCode: 400 });
    }
    const nextDate = date => {
      const next = new Date(`${date}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      return next.toISOString().slice(0, 10);
    };
    const start = filters.startDate && filters.startDate > from ? filters.startDate : from;
    const end = filters.endDate && nextDate(filters.endDate) < after ? nextDate(filters.endDate) : after;
    const period = { from, to, startDate: filters.startDate || "", endDate: filters.endDate || "" };
    if (start >= end) return buildFinancialMovements({}, period);

    const [payments, expenses, revenues] = await Promise.all([
      Payment.find({ ...activePayments, ...between("paidAt", start, end) })
        .select("id monthlyFeeId userId amount paidAt createdAt method").lean(),
      Expense.find({ schoolId: schoolId(), status: "paid", ...between("paidAt", start, end) })
        .select("id description category reference initiator status paidAt paidAmount method createdAt").lean(),
      Revenue.find({ schoolId: schoolId(), status: "received", ...between("receivedAt", start, end) })
        .select("id description category reference initiator status receivedAt receivedAmount method createdAt").lean()
    ]);
    const feeIds = [...new Set(payments.map(item => item.monthlyFeeId).filter(Boolean))];
    const userIds = [...new Set(payments.map(item => String(item.userId || "")).filter(id => /^[\da-f]{24}$/i.test(id)))];
    const [fees, users] = await Promise.all([
      MonthlyFee.find({ id: { $in: feeIds } }).select("id reference").lean(),
      User.find({ _id: { $in: userIds } }).select("user_name user_mat").lean()
    ]);
    return buildFinancialMovements({ payments, fees, users, expenses, revenues }, period);
  }

  async getReceipts(filters = {}) {
    const { from, after } = resolveRange(filters);
    const payments = await Payment.find({ ...activePayments, ...between("paidAt", from, after) })
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
