/* Build a read-only cash statement from the original financial records.
   Monta um extrato somente de consulta, sem copiar nem criar lançamentos no banco. */
const round = value => Math.round((Number(value) || 0) * 100) / 100;
const amount = value => Number.isFinite(Number(value)) ? round(value) : 0;
const newestFirst = (a, b) =>
  String(b.date).localeCompare(String(a.date)) ||
  String(b.sortAt || "").localeCompare(String(a.sortAt || "")) ||
  String(a.id).localeCompare(String(b.id));

export function buildFinancialMovements({ payments = [], fees = [], users = [], expenses = [], revenues = [] }, period = {}) {
  const byFee = new Map(fees.map(item => [String(item.id), item]));
  const byUser = new Map(users.map(item => [String(item._id), item]));
  const groupedPayments = new Map();

  /* Multiple installments of the same fee are shown on ONE row per selected period.
     Parcelas da mesma mensalidade viram UMA linha no período selecionado. */
  for (const payment of payments) {
    const value = amount(payment.amount);
    if (payment.status === "reversed" || value <= 0 || !payment.paidAt) continue;
    const feeId = String(payment.monthlyFeeId || payment.id);
    const user = byUser.get(String(payment.userId));
    const fee = byFee.get(feeId);
    if (!groupedPayments.has(feeId)) groupedPayments.set(feeId, {
      id: `monthlyFee:${feeId}`, sourceId: feeId, origin: "monthlyFee", direction: "in",
      description: `Mensalidade — ${user?.user_name || "Aluno não encontrado"}`,
      category: "Mensalidades", reference: fee?.reference || "",
      userId: String(payment.userId || ""), studentMat: user?.user_mat || "",
      responsible: null, amount: 0, date: "", sortAt: "", methods: [], details: []
    });
    const entry = groupedPayments.get(feeId);
    entry.amount = round(entry.amount + value);
    const date = String(payment.paidAt).slice(0, 10);
    if (date > entry.date || (date === entry.date && String(payment.createdAt || "") > entry.sortAt)) {
      entry.date = date;
      entry.sortAt = String(payment.createdAt || "");
    }
    if (payment.method && !entry.methods.includes(payment.method)) entry.methods.push(payment.method);
    entry.details.push({ id: String(payment.id || ""), date, amount: value, method: payment.method || "Não informado" });
  }
  const rows = [...groupedPayments.values()].map(entry => ({
    ...entry, method: entry.methods.length === 1 ? entry.methods[0] : "Diversas",
    details: entry.details.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
    transactionCount: entry.details.length
  }));

  /* Expenses and revenues have one settlement record each in the current system.
     Despesas e proventos possuem uma quitação por lançamento no modelo atual. */
  for (const item of expenses) {
    const value = amount(item.paidAmount);
    if (item.status !== "paid" || !item.paidAt || value <= 0) continue;
    const date = String(item.paidAt).slice(0, 10);
    rows.push({ id: `expense:${item.id}`, sourceId: String(item.id), origin: "expense", direction: "out",
      description: item.description || "Despesa", category: item.category || "Outros", reference: item.reference || "",
      responsible: item.initiator || null, amount: value, date, sortAt: item.createdAt || "",
      method: item.method || "Não informado", transactionCount: 1,
      details: [{ id: String(item.id), date, amount: value, method: item.method || "Não informado" }] });
  }
  for (const item of revenues) {
    const value = amount(item.receivedAmount);
    if (item.status !== "received" || !item.receivedAt || value <= 0) continue;
    const date = String(item.receivedAt).slice(0, 10);
    rows.push({ id: `revenue:${item.id}`, sourceId: String(item.id), origin: "revenue", direction: "in",
      description: item.description || "Provento", category: item.category || "Outros", reference: item.reference || "",
      responsible: item.initiator || null, amount: value, date, sortAt: item.createdAt || "",
      method: item.method || "Não informado", transactionCount: 1,
      details: [{ id: String(item.id), date, amount: value, method: item.method || "Não informado" }] });
  }
  rows.sort(newestFirst);
  const received = round(rows.filter(item => item.direction === "in").reduce((n, item) => n + item.amount, 0));
  const paid = round(rows.filter(item => item.direction === "out").reduce((n, item) => n + item.amount, 0));
  return { ...period, totals: { received, paid, balance: round(received - paid), count: rows.length }, rows };
}
