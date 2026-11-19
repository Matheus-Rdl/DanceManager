/* EN: Account opening balances use BRL amounts with at most two decimal places.
   PT: Saldos iniciais das contas usam valores em reais com no máximo duas casas decimais. */
export const isValidInitialBalance = value => {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  const cents = value * 100;
  return Number.isSafeInteger(Math.round(cents)) && Math.abs(cents - Math.round(cents)) < 1e-7;
};

/* EN: Validate real calendar dates; ISO text keeps the project's existing date convention.
   PT: Valida datas reais do calendário; o formato ISO em texto mantém o padrão atual do projeto. */
export const isValidBalanceDate = value => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2200) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
