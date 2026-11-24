/* EN: Normalize the paginated API response before rendering financial history.
       Never infer a transfer from revenue or expense movements.
   PT: Normaliza a resposta paginada antes de exibir o histórico financeiro.
       Nunca presume transferências a partir de receitas ou despesas. */
export function normalizeFinancialTransfersHistory(data) {
  if (!data || !Array.isArray(data.items) || !Number.isSafeInteger(data.total) || data.total < 0 ||
      !Number.isSafeInteger(data.page) || data.page < 1 ||
      !Number.isSafeInteger(data.limit) || data.limit < 1) {
    throw new Error("Resposta inesperada ao consultar o histórico de transferências.");
  }
  return { items: data.items, page: data.page, limit: data.limit, total: data.total,
    hasPrevious: data.page > 1,
    hasNext: data.page * data.limit < data.total };
}

/* EN: Show the actual instant in São Paulo rather than slicing a UTC timestamp.
   PT: Apresenta a data e hora real de São Paulo, sem cortar o timestamp UTC. */
export function financialTransferDateTime(timestamp) {
  if (typeof timestamp !== "string") return "Data não disponível";
  const instant = new Date(timestamp);
  if (!Number.isFinite(instant.getTime())) return "Data não disponível";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short"
  }).format(instant);
}

/* EN: A reversed transfer remains visible: its value must not vanish from the audit trail.
   PT: Transferências estornadas continuam visíveis: o valor original não desaparece do histórico. */
export function financialTransferStatus(status) {
  return status === "completed" ? "Concluída" : status === "reversed" ? "Estornada" : "Não identificado";
}
