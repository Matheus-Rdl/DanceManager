/* Until login is implemented, keep the responsible person's choice explicit.
   Até implementar login, a escolha do responsável é feita manualmente. */
export const financialInitiators = [
  { key: "pety", name: "Pety" },
  { key: "vanessa", name: "Vanessa" }
];
export const initiatorLabel = item => item?.initiator?.name || "Não informado";
export const auditInitiatorLabel = item => item?.name || "Não informado";
