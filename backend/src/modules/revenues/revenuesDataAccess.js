import crypto from "crypto";
import { todayInBrazil } from "../monthlyFees/monthlyFeeGeneration.js";
import Revenue from "../../models/Revenue.js";
import FinancialAccount from "../../models/FinancialAccount.js";
import { initiatorFields } from "../financial/financialInitiators.js";
import {
  ensureNoPendingRevenueAccount, resolveRevenueAccountId
} from "./revenueAccountRules.js";
import {
  REVENUE_CATEGORIES, schoolId, isMonth, isDate, validation,
  cleanText, amountValue, visibleRevenue, revenueFields
} from "./revenueRules.js";

const timestamp = () => new Date().toISOString();
const history = (action, details = "", reason = "", before = null, after = null) => ({
  action, details, reason, before, after, at: timestamp()
});
const snapshot = item => ({
  description: item.description, category: item.category, amount: item.amount,
  dueDate: item.dueDate, reference: item.reference, status: item.status,
  receivedAmount: item.receivedAmount, receivedAt: item.receivedAt,
  method: item.method, notes: item.notes,
  /* EN: Include the account in new audit snapshots while preserving the legacy format.
     PT: Inclui a conta nos novos registros de auditoria sem alterar históricos antigos. */
  ...(item.accountId ? { accountId: item.accountId } : {}),
  initiator: item.initiator ? { key: item.initiator.key, name: item.initiator.name } : null
});
const reasonText = body => cleanText(body?.reason, "Justificativa", 500);
const receiptFields = body => {
  const receivedAmount = amountValue(body.receivedAmount);
  if (!isDate(body.receivedAt) || body.receivedAt > todayInBrazil()) {
    throw validation("Informe uma data de recebimento válida, que não seja futura.");
  }
  const method = cleanText(body.method, "Forma de recebimento", 70);
  return { receivedAmount, receivedAt: body.receivedAt, method };
};
const findRevenue = async id => {
  const item = await Revenue.findOne({ schoolId: schoolId(), id });
  if (!item) throw validation("Provento não encontrado.", 404);
  return item;
};
/* Optimistic concurrency protects financial corrections from overwriting each other.
   Concorrência otimista impede que correções financeiras simultâneas se sobreponham. */
const applyUpdate = async (item, changes, action, reason, details) => {
  const before = snapshot(item);
  const updated = await Revenue.findOneAndUpdate(
    { schoolId: schoolId(), id: item.id, status: item.status, updatedAt: item.updatedAt, __v: item.__v },
    { $set: { ...changes, updatedAt: timestamp() }, $inc: { __v: 1 },
      $push: { history: history(action, details, reason, before, { ...before, ...changes }) } },
    { new: true, runValidators: true }
  );
  if (!updated) throw validation("Provento alterado por outra operação. Atualize os dados.", 409);
  return visibleRevenue(updated.toObject());
};

export default class RevenuesDataAccess {
  async list(filters = {}) {
    const query = { schoolId: schoolId() };
    if (filters.from != null || filters.to != null) {
      if (!isMonth(filters.from) || !isMonth(filters.to) || filters.from > filters.to) {
        throw validation("Intervalo de competências inválido.");
      }
      const months = (Number(filters.to.slice(0, 4)) - Number(filters.from.slice(0, 4))) * 12
        + Number(filters.to.slice(5)) - Number(filters.from.slice(5)) + 1;
      if (months > 12) throw validation("Selecione um período de até 12 meses.");
      query.reference = { $gte: filters.from, $lte: filters.to };
    } else if (filters.reference != null) {
      if (!isMonth(filters.reference)) throw validation("Competência inválida.");
      query.reference = filters.reference;
    }
    if (filters.category) {
      if (!REVENUE_CATEGORIES.includes(filters.category)) throw validation("Categoria de provento inválida.");
      query.category = filters.category;
    }
    if (filters.status && !["pending", "overdue", "received", "cancelled"].includes(filters.status)) {
      throw validation("Situação de provento inválida.");
    }
    const items = await Revenue.find(query).sort({ dueDate: 1, description: 1 }).lean();
    return items.map(visibleRevenue).filter(item => !filters.status || item.displayStatus === filters.status);
  }

  /* Manual creations ignore sourceType/sourceId from clients, preventing fake integrations.
     Lançamentos manuais ignoram origem externa informada pelo cliente. */
  async create(body) {
    const fields = { ...revenueFields(body), ...initiatorFields(body, { required: true }) };
    const receivedNow = body.receivedNow === true;
    if (!receivedNow) ensureNoPendingRevenueAccount(body);
    const receipt = receivedNow ? receiptFields(body) : { receivedAmount: null, receivedAt: null, method: null };
    /* EN: Resolve the account only when an actual receipt is recorded.
       PT: Resolve a conta somente quando um recebimento efetivo é registrado. */
    const accountId = receivedNow
      ? await resolveRevenueAccountId({ requestedAccountId: body.accountId, model: FinancialAccount, schoolId: schoolId() })
      : null;
    const at = timestamp();
    const item = await Revenue.create({
      ...fields, ...receipt, accountId, id: crypto.randomUUID(), schoolId: schoolId(), sourceType: "manual", sourceId: null,
      status: receivedNow ? "received" : "pending",
      history: [history("created", "Provento manual cadastrado"), ...(receivedNow
        ? [history("received", `Recebimento informado no cadastro; conta: ${accountId ?? "não atribuída"}`)] : [])],
      createdAt: at, updatedAt: at
    });
    return visibleRevenue(item.toObject());
  }

  async update(id, body) {
    const item = await findRevenue(id);
    if (item.sourceType !== "manual") throw validation("Proventos integrados devem ser corrigidos no módulo de origem.", 409);
    if (!["pending", "received"].includes(item.status)) throw validation("Este provento não pode ser editado.", 409);
    const fields = revenueFields(body);
    if (item.status === "received") {
      const reason = reasonText(body);
      /* EN: A normal correction preserves the previous account. Only an explicit,
             valid accountId can move a received revenue to a different account.
         PT: Uma correção comum mantém a conta anterior. A troca exige o envio
             explícito de um accountId válido. */
      const accountId = body.accountId === undefined
        ? item.accountId ?? null
        : await resolveRevenueAccountId({ requestedAccountId: body.accountId, model: FinancialAccount, schoolId: schoolId() });
      return applyUpdate(item, { ...fields, ...receiptFields(body), accountId }, "received_corrected", reason,
        "Correção de provento recebido");
    }
    ensureNoPendingRevenueAccount(body);
    return applyUpdate(item, fields, "edited", String(body.reason || "").slice(0, 500), "Dados do provento alterados");
  }

  async receive(id, body) {
    const receipt = receiptFields(body);
    const responsible = initiatorFields(body);
    const accountId = await resolveRevenueAccountId({
      requestedAccountId: body.accountId, model: FinancialAccount, schoolId: schoolId()
    });
    const item = await Revenue.findOneAndUpdate(
      { schoolId: schoolId(), id, sourceType: "manual", status: "pending" },
      { $set: { ...receipt, ...responsible, accountId, status: "received", updatedAt: timestamp(),
          ...(String(body.notes || "").trim() ? { notes: String(body.notes).slice(0, 500) } : {}) },
        $inc: { __v: 1 },
        $push: { history: history("received", `Recebido ${receipt.receivedAmount} em ${receipt.receivedAt} por ${receipt.method}; responsável: ${responsible.initiator?.name || "não informado"}; conta: ${accountId ?? "não atribuída"}`) } },
      { new: true, runValidators: true }
    );
    if (!item) throw validation("Provento inexistente, integrado, cancelado ou já recebido.", 409);
    return visibleRevenue(item.toObject());
  }

  async cancel(id, body = {}) {
    const item = await findRevenue(id);
    if (item.sourceType !== "manual") throw validation("Proventos integrados devem ser corrigidos na origem.", 409);
    if (!["pending", "received"].includes(item.status)) throw validation("Provento já cancelado.", 409);
    const reason = reasonText(body);
    return applyUpdate(item, { status: "cancelled" }, "cancelled", reason,
      item.status === "received" ? "Cancelamento de provento recebido (exige estorno efetivo)" : "Cancelamento de provento pendente");
  }

  /* Delete is only allowed for untouched, pending manual records.
     Exclusão definitiva só para registros manuais pendentes e sem alterações. */
  async remove(id) {
    const item = await findRevenue(id);
    if (item.sourceType !== "manual" || item.status !== "pending" || item.receivedAt || item.receivedAmount != null ||
        item.history?.some(event => event.action !== "created")) {
      throw validation("Só é possível excluir provento manual pendente, sem recebimentos ou alterações.", 409);
    }
    const deleted = await Revenue.deleteOne({ schoolId: schoolId(), id, status: "pending", updatedAt: item.updatedAt });
    if (deleted.deletedCount !== 1) throw validation("Provento modificado por outra operação. Atualize a página.", 409);
    return { id, deleted: true };
  }
}
