import { financialInitiators } from "./financialInitiators.js";

/* EN: Parse Brazilian monetary input without silently rounding values or accepting
       malformed thousands separators. All validation happens again on the server.
   PT: Interpreta valores monetários brasileiros sem arredondamentos silenciosos nem
       separadores de milhar inválidos. O servidor também fará todas as validações. */
export function parseTransferAmount(input) {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  const grouped = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(raw);
  const simple = /^\d+(?:[,.]\d{1,2})?$/.test(raw);
  if (!grouped && !simple) return null;
  const normalized = grouped ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(",", ".");
  const [integer, decimals = ""] = normalized.split(".");
  const cents = Number(integer) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents / 100 : null;
}

/* EN: The dialog accepts only active accounts and never derives account IDs from names.
   PT: O formulário aceita somente contas ativas e não deduz IDs pelo nome da conta. */
export const activeTransferAccounts = accounts =>
  Array.isArray(accounts) ? accounts.filter(account => account?.active === true &&
    typeof account.id === "string" && account.id.trim() !== "") : [];

/* EN: Client-side checks improve the experience; the backend remains authoritative
       about actual balances, ownership, duplicate operations and permissions.
   PT: As verificações locais melhoram a experiência; o backend continua responsável
       pelos saldos reais, titularidade, duplicidade e autorização da operação. */
export function validateTransferDraft(draft, accounts) {
  const validAccounts = activeTransferAccounts(accounts);
  const from = validAccounts.find(account => account.id === draft.fromAccountId);
  const to = validAccounts.find(account => account.id === draft.toAccountId);
  const amount = parseTransferAmount(draft.amount);
  const errors = {};

  if (!from) errors.fromAccountId = "Selecione uma conta de origem ativa.";
  if (!to) errors.toAccountId = "Selecione uma conta de destino ativa.";
  if (from && to && from.id === to.id) errors.toAccountId = "A conta de destino deve ser diferente da origem.";
  if (amount === null) errors.amount = "Informe um valor positivo com até duas casas decimais.";

  if (from && amount !== null) {
    if (from.available !== true || !Number.isFinite(from.balance)) {
      errors.fromAccountId = "Saldo de origem indisponível. Atualize as contas antes de continuar.";
    } else if (Math.round(from.balance * 100) < Math.round(amount * 100)) {
      errors.amount = "O valor excede o saldo disponível na conta de origem.";
    }
  }

  if (!financialInitiators.some(item => item.key === draft.initiatorKey)) {
    errors.initiatorKey = "Selecione o responsável pela transferência.";
  }
  if (typeof draft.note !== "string" || draft.note.trim().length > 500) {
    errors.note = "A observação deve ter até 500 caracteres.";
  }
  return { valid: Object.keys(errors).length === 0, errors, amount, from, to };
}
