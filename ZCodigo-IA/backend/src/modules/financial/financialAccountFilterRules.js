/* EN: Validate the public account filter without accepting a school ID from the client.
   PT: Valida o filtro público sem aceitar identificação da escola enviada pelo cliente. */
export function validateFinancialAccountId(accountId) {
  if (accountId == null || accountId === "") return "";
  if (typeof accountId !== "string" || !/^[a-zA-Z0-9-]{1,128}$/.test(accountId)) {
    throw Object.assign(new Error("Conta financeira inválida."), { statusCode: 400 });
  }
  return accountId;
}

/* EN: Match only accounts belonging to the configured school. Inactive accounts remain queryable.
   PT: Consulta somente contas da escola configurada. Contas inativas continuam consultáveis. */
export async function accountMatchForSchool(accountId, { accountModel, getSchoolId }) {
  const id = validateFinancialAccountId(accountId);
  if (!id) return {};
  const account = await accountModel.findOne({ id, schoolId: getSchoolId() }).select("id").lean();
  if (!account) throw Object.assign(new Error("Conta financeira não encontrada nesta escola."), { statusCode: 404 });
  return { accountId: account.id };
}
