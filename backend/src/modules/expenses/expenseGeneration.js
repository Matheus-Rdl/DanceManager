import crypto from "crypto";
import Expense from "../../models/Expense.js";
import ExpenseRecurrence from "../../models/ExpenseRecurrence.js";
import { schoolId, monthNow, addMonths, dueDateFor } from "./expenseRules.js";

export const ensureExpensesForRecurrence = async (recurrence, { currentMonth = monthNow() } = {}) => {
  if (!recurrence?.active) return 0;
  const endMonth = addMonths(currentMonth, 2);
  if (recurrence.startMonth > endMonth) return 0;
  const first = recurrence.startMonth;
  /* Nova recorrência lançada no passado: regulariza as competências desde o início. */
  const distance = (Number(endMonth.slice(0, 4)) - Number(first.slice(0, 4))) * 12 + Number(endMonth.slice(5)) - Number(first.slice(5));
  if (distance > 1200) throw new Error("Recorrência com período muito extenso.");
  const now = new Date().toISOString();
  const actions = [];
  for (let i = 0; i <= distance; i++) {
    const month = addMonths(first, i);
    const record = {
      id: crypto.randomUUID(), schoolId: recurrence.schoolId, recurrenceId: recurrence.id,
      description: recurrence.description, category: recurrence.category,
      amount: recurrence.amount, reference: month, dueDate: dueDateFor(month, recurrence.dueDay),
      status: "pending", paidAt: null, paidAmount: null, method: null, notes: "",
      createdAt: now, updatedAt: now,
      history: [{ action: "generated", at: now, details: `Gerada para ${month}` }]
    };
    actions.push({ updateOne: { filter: { schoolId: recurrence.schoolId, recurrenceId: recurrence.id, reference: month }, update: { $setOnInsert: record }, upsert: true } });
  }
  if (!actions.length) return 0;
  try {
    const result = await Expense.bulkWrite(actions, { ordered: false });
    return result.upsertedCount || 0;
  } catch (error) {
    /* Duas instâncias podem gerar a mesma competência simultaneamente. */
    if (error.code === 11000 || error.writeErrors?.every(entry => entry.code === 11000)) return 0;
    throw error;
  }
};

export const ensureAllExpenses = async () => {
  const recurrences = await ExpenseRecurrence.find({ schoolId: schoolId(), active: true }).lean();
  let total = 0;
  for (const recurrence of recurrences) total += await ensureExpensesForRecurrence(recurrence);
  return total;
};
