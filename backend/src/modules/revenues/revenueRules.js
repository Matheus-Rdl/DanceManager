import { todayInBrazil } from "../monthlyFees/monthlyFeeGeneration.js";
import { initiatorFields } from "../financial/financialInitiators.js";
import { isDate, isMonth, validation, cleanText, amountValue, schoolId } from "../expenses/expenseRules.js";

export { isDate, isMonth, validation, cleanText, amountValue, schoolId };
export const REVENUE_CATEGORIES = ["Vendas", "Serviços", "Inscrições", "Patrocínios", "Doações", "Eventos", "Outros"];
export const visibleRevenue = item => ({
  ...item,
  displayStatus: item.status === "pending" && item.dueDate < todayInBrazil() ? "overdue" : item.status
});
export const revenueFields = body => {
  const description = cleanText(body.description);
  const category = body.category;
  if (!REVENUE_CATEGORIES.includes(category)) throw validation("Categoria de provento inválida.");
  const amount = amountValue(body.amount);
  if (!isDate(body.dueDate)) throw validation("Informe uma data prevista válida.");
  return {
    description, category, amount, dueDate: body.dueDate,
    reference: body.dueDate.slice(0, 7), notes: String(body.notes || "").slice(0, 500),
    ...initiatorFields(body)
  };
};
