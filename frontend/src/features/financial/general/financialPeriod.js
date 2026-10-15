export const COLORS = { green: "#064e43", gray: "#607873", red: "#d9343a" };
export const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = value => currency.format(Number(value) || 0);
export const nowReference = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
export const padMonth = month => String(month).padStart(2, "0");
export const shiftMonth = (reference, offset) => {
  const [year, month] = reference.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  return `${next.getFullYear()}-${padMonth(next.getMonth() + 1)}`;
};
export const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const PERIOD_MODES = [
  { id: "6", label: "6 meses" }, { id: "12", label: "12 meses" },
  { id: "year", label: "Ano" }, { id: "month", label: "Mês" }
];
export const initialPeriod = (mode = "month") => ({ mode, reference: nowReference(), year: nowReference().slice(0, 4) });
export function periodRange(period) {
  const reference = period.reference;
  if (period.mode === "6") return { from: shiftMonth(reference, -5), to: reference };
  if (period.mode === "12") return { from: shiftMonth(reference, -11), to: reference };
  if (period.mode === "year") return { from: `${period.year}-01`, to: `${period.year}-12` };
  return { from: reference, to: reference };
}
export const formatDate = value => !value ? "—" : String(value).slice(0, 10).split("-").reverse().join("/");
export const formatMonth = reference => {
  const [year, month] = String(reference || "").split("-").map(Number);
  return month >= 1 && month <= 12 ? `${MONTHS[month-1]} de ${year}` : "—";
};
export const formatPeriod = period => {
  const { from, to } = periodRange(period);
  return from === to ? formatMonth(from) : `${formatMonth(from)} a ${formatMonth(to)}`;
};
