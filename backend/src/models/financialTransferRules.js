/* EN: Transfer amounts use positive BRL values with no fractions of a cent.
   PT: Transferências usam valores positivos em reais, sem frações de centavo. */
export const isValidTransferAmount = value => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return false;
  const cents = value * 100;
  return Number.isSafeInteger(Math.round(cents)) && Math.abs(cents - Math.round(cents)) < 1e-7;
};

/* EN: Account references use the same UUID IDs as FinancialAccount.id, not MongoDB _id.
   PT: As referências usam os UUIDs de FinancialAccount.id, não o _id do MongoDB. */
export const isValidTransferAccountId = value => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/* EN: A transfer cannot originate from and arrive in the same account.
   PT: Uma transferência não pode ter a mesma conta como origem e destino. */
export const hasDistinctTransferAccounts = (sourceId, destinationId) =>
  isValidTransferAccountId(sourceId) &&
  isValidTransferAccountId(destinationId) &&
  sourceId !== destinationId;

/* EN: Store exact UTC instants, avoiding timezone-free dates that change day boundaries.
   PT: Armazena instantes UTC exatos, evitando datas sem fuso que mudam os limites do dia. */
export const isValidTransferTimestamp = value => {
  if (typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const time = new Date(value);
  return Number.isFinite(time.getTime()) && time.toISOString() === value;
};
