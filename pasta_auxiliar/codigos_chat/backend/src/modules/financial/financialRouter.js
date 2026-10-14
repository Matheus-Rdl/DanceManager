import express from "express";
import Payment from "../../models/Payment.js";
import MonthlyFee from "../../models/MonthlyFee.js";
import Expense from "../../models/Expense.js";
import User from "../../models/User.js";
import { ensureAllExpenses } from "../expenses/expenseGeneration.js";
import { schoolId, monthNow, isMonth, addMonths } from "../expenses/expenseRules.js";
import { todayInBrazil } from "../monthlyFees/monthlyFeeGeneration.js";

const router = express.Router();
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
router.get("/summary", async (req, res) => {
  try {
    const month = resolveMonth(req.query.month);
    await ensureAllExpenses();
    const startChart = addMonths(month, -5);
    const end = addMonths(month, 1);
    const [payments, paidExpenses, fees, dueExpenses] = await Promise.all([
      Payment.find(between("paidAt", startChart, end)).select("amount paidAt").lean(),
      Expense.find({ schoolId: schoolId(), status: "paid", ...between("paidAt", startChart, end) }).select("paidAmount paidAt").lean(),
      MonthlyFee.find({ reference: month, status: { $ne: "cancelled" } }).select("amount paidAmount dueDate status").lean(),
      Expense.find({ schoolId: schoolId(), reference: month, status: { $ne: "cancelled" } }).select("amount paidAmount status dueDate").lean()
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
    return res.json({ success: true, statusCode: 200, body: {
      month, received, expensesPaid, result: Math.round((received - expensesPaid) * 100) / 100,
      expectedFees: sum(fees, "amount"),
      openFees: Math.round(fees.reduce((acc, f) => acc + Math.max(0, Number(f.amount) - Number(f.paidAmount || 0)), 0) * 100) / 100,
      overdueFeesCount: feesOverdue.length,
      overdueFeesValue: Math.round(feesOverdue.reduce((acc, f) => acc + Math.max(0, Number(f.amount) - Number(f.paidAmount || 0)), 0) * 100) / 100,
      pendingExpensesCount: pendingExpenses.length,
      pendingExpensesValue: sum(pendingExpenses, "amount"),
      timeline
    } });
  } catch (error) {
    const code = error.statusCode || 500;
    console.error("[Financeiro]", error);
    return res.status(code).json({ success: false, statusCode: code, body: code === 500 ? "Erro interno ao calcular o resumo financeiro." : error.message });
  }
});

router.get("/receipts", async (req, res) => {
  try {
    const month = resolveMonth(req.query.month);
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
    return res.json({ success: true, statusCode: 200, body: payments.map(p => ({
      ...p,
      monthlyFee: byFee.get(p.monthlyFeeId) || null,
      student: { name: byUser.get(p.userId)?.user_name || "Aluno não encontrado", mat: byUser.get(p.userId)?.user_mat || "" }
    })) });
  } catch (error) {
    const code = error.statusCode || 500;
    console.error("[Financeiro]", error);
    return res.status(code).json({ success: false, statusCode: code, body: code === 500 ? "Erro interno ao consultar recebimentos." : error.message });
  }
});
export default router;
