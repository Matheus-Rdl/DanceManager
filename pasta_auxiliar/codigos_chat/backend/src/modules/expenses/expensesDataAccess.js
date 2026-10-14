import crypto from "crypto";
import { todayInBrazil } from "../monthlyFees/monthlyFeeGeneration.js";
import Expense from "../../models/Expense.js";
import ExpenseRecurrence from "../../models/ExpenseRecurrence.js";
import { ensureAllExpenses, ensureExpensesForRecurrence } from "./expenseGeneration.js";
import {
  schoolId, monthNow, addMonths, isMonth, isDate, CATEGORIES, validation,
  cleanText, amountValue, expenseFields, dueDateFor, visibleExpense
} from "./expenseRules.js";

const moment = () => new Date().toISOString();
const log = (action, details = "") => ({ action, details, at: moment() });
const findExpense = async (id) => {
  const item = await Expense.findOne({ schoolId: schoolId(), id });
  if (!item) throw validation("Despesa não encontrada.", 404);
  return item;
};
const findRecurrence = async (id) => {
  const item = await ExpenseRecurrence.findOne({ schoolId: schoolId(), id });
  if (!item) throw validation("Recorrência não encontrada.", 404);
  return item;
};
const recurrenceFields = (body) => {
  const description = cleanText(body.description);
  if (!CATEGORIES.includes(body.category)) throw validation("Categoria inválida.");
  const amount = amountValue(body.amount);
  const dueDay = Number(body.dueDay);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw validation("Dia de vencimento inválido (1 a 31).");
  return { description, category: body.category, amount, dueDay };
};

export default class ExpensesDataAccess {
  async list(filters = {}) {
    await ensureAllExpenses();
    const query = { schoolId: schoolId() };
    if (filters.reference) {
      if (!isMonth(filters.reference)) throw validation("Competência inválida.");
      query.reference = filters.reference;
    }
    if (filters.category) {
      if (!CATEGORIES.includes(filters.category)) throw validation("Categoria inválida.");
      query.category = filters.category;
    }
    const data = await Expense.find(query).sort({ dueDate: 1, description: 1 }).lean();
    return data.map(visibleExpense).filter(item => !filters.status || item.displayStatus === filters.status);
  }

  async listRecurrences() {
    return ExpenseRecurrence.find({ schoolId: schoolId() }).sort({ active: -1, description: 1 }).lean();
  }

  async create(body) {
    const fields = expenseFields(body);
    const time = moment();
    const item = await Expense.create({
      ...fields, id: crypto.randomUUID(), schoolId: schoolId(), recurrenceId: null,
      status: "pending", paidAmount: null, paidAt: null, method: null,
      history: [log("created", "Despesa avulsa cadastrada")], createdAt: time, updatedAt: time
    });
    return visibleExpense(item.toObject());
  }

  async update(id, body) {
    const item = await findExpense(id);
    if (item.status !== "pending") throw validation("Somente despesas pendentes podem ser editadas.", 409);
    const fields = expenseFields(body);
    if (item.recurrenceId && fields.reference !== item.reference) {
      throw validation("Uma despesa recorrente não pode mudar de competência. Edite a recorrência para as próximas cobranças.", 409);
    }
    const changed = await Expense.findOneAndUpdate(
      { schoolId: schoolId(), id, status: "pending" },
      { $set: { ...fields, updatedAt: moment() }, $push: { history: log("edited", "Dados da despesa alterados individualmente") } },
      { new: true, runValidators: true }
    );
    if (!changed) throw validation("Despesa alterada por outra operação. Atualize a tela.", 409);
    return visibleExpense(changed.toObject());
  }

  async pay(id, body) {
    const paidAmount = amountValue(body.paidAmount);
    const paidAt = body.paidAt;
    if (!isDate(paidAt)) throw validation("Informe uma data de pagamento válida.");
    if (paidAt > todayInBrazil()) throw validation("Não é possível registrar um pagamento futuro.");
    const method = cleanText(body.method, "Forma de pagamento", 70);
    const notes = String(body.notes || "").slice(0, 500);
    const paid = await Expense.findOneAndUpdate(
      { schoolId: schoolId(), id, status: "pending" },
      { $set: { status: "paid", paidAmount, paidAt, method, notes, updatedAt: moment() },
        $push: { history: log("paid", `Pagamento de ${paidAmount} em ${paidAt} por ${method}`) } },
      { new: true, runValidators: true }
    );
    if (!paid) throw validation("Despesa inexistente, cancelada ou já paga.", 409);
    return visibleExpense(paid.toObject());
  }

  async cancel(id) {
    const cancelled = await Expense.findOneAndUpdate(
      { schoolId: schoolId(), id, status: "pending" },
      { $set: { status: "cancelled", updatedAt: moment() },
        $push: { history: log("cancelled", "Despesa cancelada manualmente") } },
      { new: true, runValidators: true }
    );
    if (!cancelled) throw validation("Despesa inexistente ou já finalizada.", 409);
    return visibleExpense(cancelled.toObject());
  }

  async createRecurrence(body) {
    const fields = recurrenceFields(body);
    const startMonth = body.startMonth || monthNow();
    if (!isMonth(startMonth)) throw validation("Mês inicial inválido.");
    if (startMonth < "1900-01") throw validation("Mês inicial inválido.");
    const distance = (Number(monthNow().slice(0, 4)) - Number(startMonth.slice(0, 4))) * 12 + Number(monthNow().slice(5)) - Number(startMonth.slice(5));
    if (distance > 1200) throw validation("Mês inicial muito antigo.");
    const time = moment();
    const recurrence = await ExpenseRecurrence.create({
      ...fields, id: crypto.randomUUID(), schoolId: schoolId(), startMonth,
      active: true, endedAt: null, history: [log("created", "Recorrência mensal iniciada")],
      createdAt: time, updatedAt: time
    });
    await ensureExpensesForRecurrence(recurrence);
    return recurrence.toObject();
  }

  /* Edita a regra para esta competência e futuras que ainda não foram pagas. */
  async updateRecurrence(id, body) {
    const recurrence = await findRecurrence(id);
    if (!recurrence.active) throw validation("Esta recorrência já foi encerrada.", 409);
    const fields = recurrenceFields(body);
    const effectiveFrom = body.effectiveFrom || monthNow();
    if (!isMonth(effectiveFrom) || effectiveFrom < monthNow() || effectiveFrom > addMonths(monthNow(), 2) || effectiveFrom < recurrence.startMonth) {
      throw validation("A edição deve começar em uma competência da janela atual (mês vigente ou próximos dois meses).");
    }
    const existing = await Expense.find({ schoolId: schoolId(), recurrenceId: id, reference: { $gte: effectiveFrom }, status: "pending" });
    /* Evita reescrever despesa já paga. Edição afeta somente competências ainda abertas. */
    const old = { description: recurrence.description, category: recurrence.category, amount: recurrence.amount, dueDay: recurrence.dueDay };
    Object.assign(recurrence, fields);
    recurrence.updatedAt = moment();
    recurrence.history.push(log("edited", `A partir de ${effectiveFrom}: ${JSON.stringify(old)} -> ${JSON.stringify(fields)}`));
    await recurrence.save();
    for (const item of existing) {
      item.description = fields.description;
      item.category = fields.category;
      item.amount = fields.amount;
      item.dueDate = dueDateFor(item.reference, fields.dueDay);
      item.updatedAt = moment();
      item.history.push(log("recurrence_updated", `Regra alterada a partir de ${effectiveFrom}`));
      await item.save();
    }
    await ensureExpensesForRecurrence(recurrence);
    return recurrence.toObject();
  }

  async stopRecurrence(id) {
    const recurrence = await findRecurrence(id);
    if (!recurrence.active) throw validation("Recorrência já encerrada.", 409);
    const current = monthNow();
    recurrence.active = false;
    recurrence.endedAt = moment();
    recurrence.updatedAt = moment();
    recurrence.history.push(log("stopped", `Novas despesas suspensas a partir de ${current}`));
    await recurrence.save();
    /* Mantém competência atual e histórico; cancela apenas as FUTURAS não pagas. */
    const upcoming = await Expense.find({ schoolId: schoolId(), recurrenceId: id, reference: { $gt: current }, status: "pending" });
    for (const item of upcoming) {
      item.status = "cancelled";
      item.updatedAt = moment();
      item.history.push(log("cancelled", "Recorrência encerrada antes do vencimento"));
      await item.save();
    }
    return recurrence.toObject();
  }
}
