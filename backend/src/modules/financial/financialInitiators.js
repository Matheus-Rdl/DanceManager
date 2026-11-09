/* Fixed list until authenticated system users are available.
   Lista fixa até existirem usuários autenticados no sistema. */
export const FIXED_INITIATORS = Object.freeze({ pety: "Pety", vanessa: "Vanessa" });

/* Only a known key is accepted; display names and future user IDs cannot be supplied by clients.
   Aceita somente uma chave conhecida; nomes e IDs de futuros usuários não vêm do cliente. */
export const initiatorFields = (body = {}, { required = false } = {}) => {
  if (!Object.prototype.hasOwnProperty.call(body, "initiatorKey")) {
    if (!required) return {};
    throw Object.assign(new Error("Selecione o responsável pela movimentação."), { statusCode: 400 });
  }
  const key = String(body.initiatorKey || "").trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(FIXED_INITIATORS, key)) {
    throw Object.assign(new Error("Responsável inválido. Selecione Pety ou Vanessa."), { statusCode: 400 });
  }
  return { initiator: { kind: "fixed", key, name: FIXED_INITIATORS[key], userId: null } };
};
