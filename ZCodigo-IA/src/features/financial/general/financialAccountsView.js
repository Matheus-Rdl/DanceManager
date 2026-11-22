/* EN: Merge account registrations with read-only calculated balances, always matching by ID.
       Missing or unavailable balances stay unavailable; they must never be displayed as zero.
   PT: Combina cadastros com saldos calculados somente para leitura, relacionando pelo ID.
       Saldos ausentes ou indisponíveis não devem aparecer como zero. */
export function buildFinancialAccountsView(accounts, balances) {
  if (!Array.isArray(accounts) || !balances || !Array.isArray(balances.accounts)) {
    throw new Error("Resposta inesperada ao consultar saldos das contas financeiras.");
  }

  const byId = new Map(balances.accounts.map(account => [account.id, account]));
  const items = accounts.map(account => {
    const calculated = byId.get(account.id);
    const validBalance = calculated?.available === true &&
      typeof calculated.balance === "number" && Number.isFinite(calculated.balance);
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      active: account.active === true,
      isDefault: account.isDefault === true,
      balance: validBalance ? calculated.balance : null,
      available: validBalance
    };
  });

  /* EN: The server owns the consolidated balance, including inactive accounts.
         An incomplete response cannot be presented as a complete total.
     PT: O servidor calcula o saldo consolidado, incluindo contas inativas.
         Uma resposta incompleta não pode ser exibida como total definitivo. */
  const complete = balances.complete === true && items.every(item => item.available);
  const validTotal = complete && typeof balances.totalBalance === "number" &&
    Number.isFinite(balances.totalBalance);
  return {
    accounts: items,
    asOf: balances.asOf || null,
    complete: complete && validTotal,
    totalBalance: validTotal ? balances.totalBalance : null
  };
}

/* EN: Unlike the existing money helper, this formatter never coerces missing balances to R$ 0.
   PT: Diferente do formatador genérico, este não transforma saldos ausentes em R$ 0. */
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const financialAccountMoney = value =>
  typeof value === "number" && Number.isFinite(value) ? currency.format(value) : "—";

export const financialAccountTypeLabel = type => ({
  bank: "Conta bancária", payment: "Conta de pagamento", cash: "Dinheiro físico"
})[type] || "Conta financeira";
