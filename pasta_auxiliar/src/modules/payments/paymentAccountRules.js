import { validAccountId } from "../financialAccounts/financialAccountsRules.js";

const paymentAccountError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

/* EN: Treat omitted accountId differently from null, blank, or malformed IDs.
   PT: Diferencia accountId omitido de IDs nulos, vazios ou inválidos. */
export const validateRequestedPaymentAccountId = value => {
  if (value === undefined) return undefined;
  if (!validAccountId(value)) throw paymentAccountError("Conta financeira inválida.");
  return value;
};

/* EN: Resolve financial accounts inside the same MongoDB session as the payment.
       An omitted account uses the active default of the server's school. If no accounts
       have been configured yet, legacy payments remain possible until the seed is run.
   PT: Resolve as contas na mesma sessão MongoDB do pagamento. Quando a conta não é
       informada, usa a conta padrão ativa da escola definida pelo servidor. Se não houver
       nenhuma conta cadastrada, mantém a compatibilidade até executar o cadastro inicial. */
export const resolvePaymentAccountId = async ({ requestedAccountId, model, schoolId, session }) => {
  const id = validateRequestedPaymentAccountId(requestedAccountId);
  if (id !== undefined) {
    const account = await model.findOne({ id, schoolId, active: true }).session(session).lean();
    if (!account) throw paymentAccountError("Conta financeira inexistente, inativa ou de outra escola.", 404);
    return account.id;
  }

  const defaultAccount = await model.findOne({ schoolId, isDefault: true, active: true }).session(session).lean();
  if (defaultAccount) return defaultAccount.id;

  const anyAccount = await model.findOne({ schoolId }).session(session).lean();
  if (anyAccount) throw paymentAccountError("Não há conta financeira padrão ativa nesta escola.", 409);
  return null;
};
