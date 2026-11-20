import {
  isValidTransferAmount, hasDistinctTransferAccounts, isValidTransferTimestamp
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
