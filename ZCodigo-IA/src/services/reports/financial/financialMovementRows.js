/* EN: Keep the screen filters and the Excel export aligned; never change API source rows.
   PT: Mantém os filtros da tela e da exportação alinhados, sem alterar os dados da API. */
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const round = value => Math.round(Number(value || 0) * 100) / 100;
const ORIGINS = { monthlyFee: "Mensalidades", revenue: "Proventos", expense: "Despesas" };

export function filterFinancialMovementRows(rows = [], { search = "", origin = "", responsible = "", method = "" } = {}) {
  const query = normalize(search.trim());
  const matches = rows.filter(item => {
    const methods = (item.details || []).map(detail => detail.method).join(" ");
    const searchable = normalize(`${item.description} ${item.category} ${item.reference} ${item.studentMat || ""} ${item.responsible?.name || "Não informado"} ${item.method} ${methods}`);
    return (!query || searchable.includes(query)) &&
      (!origin || item.origin === origin) &&
      (!responsible || (responsible === "unknown" ? !item.responsible?.key : item.responsible?.key === responsible)) &&
      (!method || item.details?.some(detail => detail.method === method));
  });
  if (!method) return matches;

  /* EN: A payment-method filter must exclude OTHER installments in mixed-method fees.
     PT: O filtro de forma de pagamento também exclui parcelas feitas por outros métodos. */
  return matches.map(item => {
    const details = (item.details || []).filter(detail => detail.method === method);
    return { ...item, details, method, methods: [method], transactionCount: details.length,
      amount: round(details.reduce((total, detail) => total + Number(detail.amount || 0), 0)),
      date: details.reduce((latest, detail) => detail.date > latest ? detail.date : latest, "") || item.date };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.id).localeCompare(String(b.id)));
}

/* EN: One spreadsheet row per actual settlement, including each partial monthly-fee payment.
   PT: Uma linha por pagamento realizado, inclusive cada parcela de mensalidade. */
export function getFinancialMovementExportRows(rows = [], { accounts = [] } = {}) {
  /* EN: Resolve names from the account registry, including inactive accounts for historical exports.
     PT: Busca os nomes no cadastro de contas, inclusive inativas para exportações históricas. */
  const accountNames = new Map(accounts.map(account => [String(account.id), String(account.name || "").trim()]));
  const result = [];
  for (const item of rows) {
    const details = Array.isArray(item.details) && item.details.length
      ? item.details : [{ date: item.date, method: item.method, amount: item.amount, accountId: item.accountId }];
    for (const detail of details) {
      const value = round(detail.amount);
      if (!Number.isFinite(value) || value <= 0) continue;
      /* EN: Each settlement owns its account; never inherit the grouped monthly fee's account.
         PT: Cada parcela tem sua própria conta; nunca presume a conta da mensalidade agrupada. */
      const accountId = detail.accountId ? String(detail.accountId) : "";
      const accountName = !accountId ? "Não identificada" :
        accountNames.get(accountId) || "Conta não localizada";
      result.push({
        date: String(detail.date || item.date || "").slice(0, 10),
        initiator: item.responsible?.name || "Não informado",
        method: detail.method || item.method || "Não informado",
        origin: ORIGINS[item.origin] || "Movimentação",
        category: item.category || "Outros",
        description: item.description || "",
        amount: item.direction === "out" ? -value : value,
        type: item.direction === "out" ? "Saída" : "Entrada",
        accountName,
        accountId
      });
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}
