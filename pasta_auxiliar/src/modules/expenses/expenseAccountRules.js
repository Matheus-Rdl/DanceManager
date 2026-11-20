import { validAccountId } from "../financialAccounts/financialAccountsRules.js";
import { validation } from "./expenseRules.js";

/* EN: An omitted account is different from an invalid account supplied by the client.
   PT: Uma conta omitida é diferente de uma conta inválida enviada pelo cliente. */
export const validateRequestedExpenseAccountId = value => {
  if (value === undefined) return undefined;
  if (!validAccountId(value)) throw validation("Conta financeira inválida.");
  return value;
};

/* EN: Pending expenses must not reserve or debit a bank account.
   PT: Despesas pendentes não devem reservar nem debitar uma conta financeira. */
export const ensureNoPendingExpenseAccount = body => {
  if (body && Object.hasOwn(body, "accountId")) {
    throw validation("Informe a conta financeira somente ao registrar o pagamento da despesa.");
  }
};

/* EN: Use an explicitly selected active account in the current school; otherwise choose
       the active default. Legacy payments may remain unassigned until accounts are seeded.
   PT: Usa a conta ativa escolhida na escola atual ou a conta padrão ativa. Pagamentos
       legados ainda podem ficar sem conta até o cadastro inicial das contas. */
export const resolveExpenseAccountId = async ({ requestedAccountId, model, schoolId }) => {
  const id = validateRequestedExpenseAccountId(requestedAccountId);
  if (id !== undefined) {
    const selected = await model.findOne({ id, schoolId, active: true }).lean();
    if (!selected) throw validation("Conta financeira inexistente, inativa ou de outra escola.", 404);
    return selected.id;
  }

  const defaultAccount = await model.findOne({ schoolId, isDefault: true, active: true }).lean();
  if (defaultAccount) return defaultAccount.id;
  const anyAccount = await model.findOne({ schoolId }).lean();
  if (anyAccount) throw validation("Não há conta financeira padrão ativa nesta escola.", 409);
  return null;
};
