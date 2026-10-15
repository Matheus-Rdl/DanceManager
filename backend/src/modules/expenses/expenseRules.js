import { todayInBrazil } from "../monthlyFees/monthlyFeeGeneration.js";

export const CATEGORIES = ["Professores", "Aluguel", "Água", "Energia", "Internet", "Materiais", "Manutenção", "Impostos", "Outros"];
/* Até implementar login por escola, o identificador vem exclusivamente da configuração do servidor. */
export const schoolId = () => process.env.SCHOOL_ID || "default";
export const monthNow = () => todayInBrazil().slice(0, 7);
export const isMonth = (value) => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const isDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
};
export const addMonths = (month, delta) => {
  const [year, num] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, num - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const dueDateFor = (month, day) => {
  const [year, num] = month.split("-").map(Number);
  const maximum = new Date(Date.UTC(year, num, 0)).getUTCDate();
  return `${month}-${String(Math.min(Number(day), maximum)).padStart(2, "0")}`;
};
export const visibleExpense = (item) => ({
  ...item,
  displayStatus: item.status === "pending" && item.dueDate < todayInBrazil() ? "overdue" : item.status
});
export const validation = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export const cleanText = (value, label = "Descrição", limit = 180) => {
  const text = String(value ?? "").trim();
  if (!text || text.length > limit) throw validation(`${label} deve conter de 1 a ${limit} caracteres.`);
  return text;
};
export const amountValue = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || Math.abs(Math.round(number * 100) - number * 100) > 1e-7) {
    throw validation("Informe um valor positivo com até duas casas decimais.");
  }
  return number;
};
export const expenseFields = (body) => {
  const description = cleanText(body.description);
  const category = body.category;
  if (!CATEGORIES.includes(category)) throw validation("Categoria inválida.");
  const amount = amountValue(body.amount);
  if (!isDate(body.dueDate)) throw validation("Informe um vencimento válido.");
  return { description, category, amount, dueDate: body.dueDate, reference: body.dueDate.slice(0, 7), notes: String(body.notes || "").slice(0, 500) };
};
