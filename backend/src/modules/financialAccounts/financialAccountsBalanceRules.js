import { isValidBalanceDate, isValidInitialBalance } from "../../models/financialAccountRules.js";
import { accountError } from "./financialAccountsRules.js";

/* EN: Calendar calculations use ISO day strings, regardless of UTC timestamps on settlements.
   PT: Os cálculos usam o dia ISO, independentemente do horário UTC de cada liquidação. */
export const nextBalanceDay = day => {
  if (!isValidBalanceDate(day)) throw accountError("Data de referência inválida.");
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

/* EN: Default to the school's Brazilian calendar day, not the server's UTC day.
   PT: Usa o dia do calendário brasileiro, e não o dia UTC do servidor. */
export const brazilBalanceDay = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const item = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${item.year}-${item.month}-${item.day}`;
};

/* EN: Never present a future projection as an available bank balance.
   PT: Não apresenta uma projeção futura como saldo bancário disponível. */
export const balanceAsOf = (requested, today = brazilBalanceDay()) => {
  const value = requested === undefined ? today : requested;
  if (!isValidBalanceDate(value)) throw accountError("Informe uma data de saldo válida (AAAA-MM-DD).");
  if (value > today) throw accountError("A data de consulta não pode estar no futuro.");
  return value;
};

const cents = (value, opening = false) => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || (opening && !isValidInitialBalance(number))) {
    throw accountError("Valor financeiro inválido no cálculo do saldo.", 500);
  }
  if (!opening && number <= 0) return 0;
  const result = Math.round(number * 100);
  if (!Number.isSafeInteger(result) || Math.abs(number * 100 - result) > 1e-7) {
    throw accountError("Valor monetário fora do intervalo permitido no cálculo do saldo.", 500);
  }
  return result;
};

const sumCents = (left, right) => {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw accountError("Saldo financeiro acima do limite permitido.", 500);
  return result;
};

/* EN: Only settlements after the END of the opening-balance day enter the running balance.
       A reversed payment is not an active receipt; handling actual refunds is a separate feature.
   PT: Apenas liquidações após o FIM da data-base entram no saldo.
       Pagamento estornado não é recebimento ativo; devoluções reais serão tratadas separadamente. */
export function calculateFinancialAccountBalances({ accounts = [], payments = [], expenses = [], revenues = [] }, asOf) {
  if (!isValidBalanceDate(asOf)) throw accountError("Data da consulta de saldos inválida.");
  const balances = accounts.map(account => {
    if (typeof account.id !== "string" || !account.id || !isValidBalanceDate(account.balanceDate)) {
      throw accountError("Cadastro de conta financeira incompleto.", 500);
    }
    const initialCents = cents(account.initialBalance, true);
    const available = account.balanceDate <= asOf;
    return {
      id: account.id, name: account.name, type: account.type,
      active: account.active === true, isDefault: account.isDefault === true,
      initialBalance: initialCents / 100, balanceDate: account.balanceDate,
      available, monthlyFeesReceived: 0, otherRevenuesReceived: 0,
      received: 0, paid: 0, balance: available ? initialCents / 100 : null,
      _startCents: initialCents, _paymentsCents: 0, _revenuesCents: 0, _expensesCents: 0
    };
  });
  const byId = new Map(balances.map(account => [account.id, account]));

  /* EN: Use each account's own baseline, since new accounts can be opened on different days.
     PT: Respeita a data-base de cada conta, pois contas futuras podem começar em dias diferentes. */
  const addRecords = (records, { dateField, amountField, statusCheck, target }) => {
    for (const record of records) {
      const account = byId.get(record.accountId);
      if (!account?.available || !statusCheck(record)) continue;
      const day = typeof record[dateField] === "string" ? record[dateField].slice(0, 10) : "";
      if (!isValidBalanceDate(day) || day <= account.balanceDate || day > asOf) continue;
      account[target] = sumCents(account[target], cents(record[amountField]));
    }
  };
  addRecords(payments, { dateField: "paidAt", amountField: "amount", target: "_paymentsCents",
    statusCheck: p => p.status == null || p.status === "confirmed" });
  addRecords(expenses, { dateField: "paidAt", amountField: "paidAmount", target: "_expensesCents",
    statusCheck: p => p.status === "paid" });
  addRecords(revenues, { dateField: "receivedAt", amountField: "receivedAmount", target: "_revenuesCents",
    statusCheck: p => p.status === "received" });

  let totalCents = 0;
  let complete = true;
  for (const account of balances) {
    if (!account.available) { complete = false; continue; }
    const receivedCents = sumCents(account._paymentsCents, account._revenuesCents);
    const currentCents = sumCents(sumCents(account._startCents, receivedCents), -account._expensesCents);
    account.monthlyFeesReceived = account._paymentsCents / 100;
    account.otherRevenuesReceived = account._revenuesCents / 100;
    account.received = receivedCents / 100;
    account.paid = account._expensesCents / 100;
    account.balance = currentCents / 100;
    totalCents = sumCents(totalCents, currentCents);
  }
  /* EN: Never expose internal accumulator fields through the API.
     PT: Não expõe campos temporários de soma na resposta da API. */
  const result = balances.map(({ _startCents, _paymentsCents, _revenuesCents, _expensesCents, ...account }) => account);
  return { asOf, accounts: result, complete, totalBalance: complete ? totalCents / 100 : null };
}
