import {
  isValidTransferAmount, isValidTransferAccountId, hasDistinctTransferAccounts, isValidTransferTimestamp
} from "../../models/financialTransferRules.js";
import { initiatorFields } from "../financial/financialInitiators.js";
import { accountError } from "../financialAccounts/financialAccountsRules.js";

const CREATE_FIELDS = ["fromAccountId", "toAccountId", "amount", "note", "initiatorKey", "idempotencyKey"];

/* EN: Only explicit transfer fields are accepted. School, status, dates and IDs are server-owned.
   PT: Só aceita campos explícitos. Escola, status, datas e IDs são definidos pelo servidor. */
export function transferCreateFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !CREATE_FIELDS.includes(key))) {
    throw accountError("Dados da transferência inválidos.");
  }
  if (!hasDistinctTransferAccounts(body.fromAccountId, body.toAccountId)) {
    throw accountError("Selecione duas contas financeiras diferentes e válidas.");
  }
  if (!isValidTransferAmount(body.amount)) {
    throw accountError("Informe um valor positivo com até duas casas decimais.");
  }
  if (body.note !== undefined && typeof body.note !== "string") {
    throw accountError("A observação da transferência deve ser um texto.");
  }
  const note = (body.note ?? "").trim();
  if (note.length > 500) throw accountError("A observação deve ter até 500 caracteres.");
  if (typeof body.idempotencyKey !== "string" ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(body.idempotencyKey)) {
    throw accountError("Envie uma chave única de operação com 8 a 128 caracteres.");
  }
  const createdBy = initiatorFields(body, { required: true }).initiator;
  return {
    fromAccountId: body.fromAccountId, toAccountId: body.toAccountId,
    amount: body.amount, note, idempotencyKey: body.idempotencyKey, createdBy
  };
}

/* EN: A replay is valid only when ALL meaningful fields match the original operation.
   PT: Uma tentativa repetida só é válida se TODOS os campos relevantes forem idênticos. */
export function sameTransferRequest(existing, request) {
  return existing.fromAccountId === request.fromAccountId &&
    existing.toAccountId === request.toAccountId &&
    existing.amount === request.amount &&
    (existing.note ?? "") === request.note &&
    existing.createdBy?.key === request.createdBy.key;
}

export function validTransferClock(value) {
  if (!isValidTransferTimestamp(value)) {
    throw accountError("Data e hora do servidor inválidas para transferência.", 500);
  }
  return value;
}

/* EN: Validate safe, bounded history filters; unknown keys must never reach a MongoDB query.
   PT: Valida filtros limitados e seguros; campos desconhecidos nunca chegam à consulta MongoDB. */
export function transferHistoryFilters(query = {}) {
  if (!query || typeof query !== "object" || Array.isArray(query) ||
      Object.keys(query).some(key => !["accountId", "status", "page", "limit"].includes(key))) {
    throw accountError("Filtros de transferências inválidos.");
  }
  const filter = {};
  if (query.accountId !== undefined) {
    if (!isValidTransferAccountId(query.accountId)) throw accountError("Conta do filtro inválida.");
    filter.accountId = query.accountId;
  }
  if (query.status !== undefined) {
    if (!["completed", "reversed"].includes(query.status)) throw accountError("Status do filtro inválido.");
    filter.status = query.status;
  }
  const positiveInteger = (value, fallback, maximum) => {
    if (value === undefined) return fallback;
    const raw = typeof value === "string" ? value : String(value);
    if (!/^[1-9]\d*$/.test(raw)) throw accountError("Paginação inválida.");
    const number = Number(raw);
    if (!Number.isSafeInteger(number) || number > maximum) throw accountError("Paginação fora do limite permitido.");
    return number;
  };
  return { filter, page: positiveInteger(query.page, 1, 1000), limit: positiveInteger(query.limit, 20, 100) };
}

/* EN: A reversal must carry a meaningful explanation and a known operator.
       Reversal metadata (status, timestamp, account IDs) is owned by the server.
   PT: O estorno exige justificativa e responsável conhecido.
       Status, data e IDs são controlados pelo servidor, não pelo cliente. */
export function transferReversalFields(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !["reason", "initiatorKey"].includes(key))) {
    throw accountError("Dados do estorno inválidos.");
  }
  if (typeof body.reason !== "string" || body.reason.trim().length < 5 || body.reason.trim().length > 500) {
    throw accountError("A justificativa deve conter entre 5 e 500 caracteres.");
  }
  const reversedBy = initiatorFields(body, { required: true }).initiator;
  return { reversalReason: body.reason.trim(), reversedBy };
}
