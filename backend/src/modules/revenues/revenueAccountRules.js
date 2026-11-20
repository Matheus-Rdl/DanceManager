import { validAccountId } from "../financialAccounts/financialAccountsRules.js";
import { validation } from "./revenueRules.js";

/* EN: Distinguish an omitted account from an explicitly invalid account ID.
   PT: Diferencia conta omitida de um ID de conta explicitamente inválido. */
export const validateRequestedRevenueAccountId = value => {
  if (value === undefined) return undefined;
  if (!validAccountId(value)) throw validation("Conta financeira inválida.");
  return value;
};

/* EN: Pending revenues cannot point to an account before money is actually received.
   PT: Proventos pendentes não podem indicar uma conta antes do recebimento efetivo. */
export const ensureNoPendingRevenueAccount = body => {
  if (body && Object.hasOwn(body, "accountId")) {
    throw validation("Informe a conta financeira somente ao registrar o recebimento do provento.");
  }
};

/* EN: Validate the selected account within the server-owned school. When no ID is sent,
       use its active default account (Noh after seeding). Legacy mode without any
       configured account remains supported until the initial setup is completed.
   PT: Valida a conta selecionada na escola definida pelo servidor. Quando não houver
       ID, usa a conta padrão ativa (Noh após o cadastro inicial). Mantém compatibilidade
       temporária se a escola ainda não tiver contas cadastradas. */
export const resolveRevenueAccountId = async ({ requestedAccountId, model, schoolId }) => {
  const id = validateRequestedRevenueAccountId(requestedAccountId);
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
