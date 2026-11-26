export const PACKAGE_STATUS = {
  active: { label: "Ativo", color: "#08715c", bg: "#e7f4ee" },
  completed: { label: "Concluído", color: "#285e9b", bg: "#eaf2fc" },
  cancelled: { label: "Cancelado", color: "#9a343c", bg: "#fcebed" }
};
export const packageStatus = value => Object.hasOwn(PACKAGE_STATUS, value) ? PACKAGE_STATUS[value] : { label: "Desconhecido", color: "#607873", bg: "#edf1ef" };
export const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const displayDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value.split("-").reverse().join("/") : "—";
export const emptyFilters = () => ({ search: "", status: "all", from: "", to: "" });
const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
export const participantsOf = row => {
  const byId = new Map((row.participants || []).map(p => [p.id, p]));
  return (row.participantIds || []).map(id => byId.get(id) || { id, name: null, registration: null, available: false });
};
export const participantName = p => p.name || "Usuário indisponível";
export const validPeriod = ({ from, to }) => !from || !to || from <= to;

/* EN: Filter the complete API list locally, with no writes and no requests on each keystroke.
   PT: Filtra a lista completa localmente, sem gravar nem consultar a cada tecla. */
export function filterPackages(rows, filters) {
  if (!validPeriod(filters)) return [];
  const term = normalize(filters.search);
  return rows.filter(row => {
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.from && (!row.contractedOn || row.contractedOn < filters.from)) return false;
    if (filters.to && (!row.contractedOn || row.contractedOn > filters.to)) return false;
    const fields = [row.name, ...participantsOf(row).flatMap(p => [p.name, p.registration])];
    return !term || fields.some(value => normalize(value).includes(term));
  });
}

/* EN: Count purchases once, regardless of participants; contracted amounts are not receipts.
   PT: Conta cada contratação uma vez, independentemente dos participantes; valor contratado não é recebimento. */
export function summarizePackages(rows) {
  const active = rows.filter(row => row.status === "active");
  return {
    count: rows.length,
    active: active.length,
    participants: new Set(active.flatMap(row => row.participantIds || [])).size,
    contractedAmount: rows.filter(row => row.status === "active" || row.status === "completed")
      .reduce((cents, row) => cents + Math.round(row.amount * 100), 0) / 100
  };
}
