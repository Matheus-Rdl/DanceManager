import crypto from "crypto";
import mongoose from "mongoose";
import Contract from "../../models/Contract.js";
import MonthlyFee from "../../models/MonthlyFee.js";
import Payment from "../../models/Payment.js";
import { resolveNewContractPlanPrice } from "../plans/plansDataAccess.js";
import {
  buildMonthlyFees, ensureMonthlyFeesForContract, getContractType, todayInBrazil
} from "../monthlyFees/monthlyFeeGeneration.js";

const TYPES = ["Plano", "Mensal", "Personalizado", "Bolsista"];
const isDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
};
const failure = (res, status, message) => res.status(status).json({ ok: false, serverError: message });
const hasPayments = async (id) => Boolean(await Payment.exists({ contractId: id }));

/* Compatibilidade: contratos Personalizados indeterminados já cadastrados
   continuam com suas regras anteriores, sem conversão automática do histórico. */
const isLegacyIndefiniteCustom = (contract) => Boolean(
  contract && getContractType(contract) === "Personalizado" &&
  (contract.indefinite === true || !contract.plannedEndDate)
);

const normalizePayload = (body, original = null) => {
  const type = original ? getContractType(original) : body.contractType;
  if (!TYPES.includes(type)) throw new Error("Tipo de contrato inválido.");
  if (original && body.contractType != null && body.contractType !== type) {
    throw new Error("O tipo do contrato não pode ser alterado após sua criação.");
  }
  if (!isDate(body.startDate)) throw new Error("Informe uma data de início válida.");
  const rawValue = Number(body.contractedValue);
  if (!Number.isFinite(rawValue) || rawValue < 0) throw new Error("Valor do contrato inválido.");
  if (type !== "Bolsista" && rawValue <= 0) throw new Error("Informe um valor mensal maior que zero.");

  const legacyIndefinite = isLegacyIndefiniteCustom(original);
  const indefinite = type === "Mensal" || legacyIndefinite ||
    (type === "Bolsista" && body.indefinite === true);
  const plannedEndDate = indefinite ? null : body.plannedEndDate || null;
  if (!indefinite && !isDate(plannedEndDate)) throw new Error("Informe uma data final válida.");
  if (!indefinite && plannedEndDate < body.startDate) throw new Error("A data final é anterior ao início.");

  if (type === "Plano" && (!body.plan || !["Mensal", "Semestral", "Anual"].includes(body.periodicity))) {
    throw new Error("Selecione um plano e uma duração válidos.");
  }
  // Os contratos Mensal e Personalizado não dependem de um plano da escola.
  const value = type === "Bolsista" ? 0 : rawValue;
  const baseValue = type === "Plano" ? Number(body.baseValue || 0) : 0;
  if (!Number.isFinite(baseValue) || baseValue < 0) throw new Error("Valor base inválido.");
  return {
    contractType: type,
    plan: type === "Plano" ? body.plan : null,
    periodicity: type === "Plano" ? body.periodicity :
      ["Mensal", "Personalizado"].includes(type) ? "Mensal" : null,
    baseValue, contractedValue: value,
    startDate: body.startDate, plannedEndDate, indefinite,
    specialCondition: ["Mensal", "Personalizado"].includes(type)
      ? { type: "Valor personalizado", customValue: value, scholarshipPercentage: null }
      : type === "Bolsista"
        ? { type: "Bolsa", customValue: null, scholarshipPercentage: 100 }
        : null
  };
};

export const getContractsByUser = async (req, res) => {
  try {
    const contracts = await Contract.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    return res.status(200).json(contracts);
  } catch (error) {
    console.error("Erro ao buscar contratos:", error);
    return failure(res, 500, "Erro ao buscar contratos.");
  }
};

export const createContract = async (req, res) => {
  try {
    if (!req.body.userId) return failure(res, 400, "Aluno não informado.");
    let payload;
    try {
      let submitted = req.body;
      if (req.body.contractType === "Plano") {
        /* O backend determina o preço do novo contrato; ignora valores enviados pelo frontend. */
        const selected = await resolveNewContractPlanPrice(req.body.plan, req.body.periodicity);
        submitted = { ...req.body, plan: selected.planName,
          baseValue: selected.monthlyValue, contractedValue: selected.monthlyValue };
      }
      payload = normalizePayload(submitted);
    }
    catch (error) { return failure(res, 400, error.message); }
    if (await Contract.exists({ userId: req.body.userId, active: true })) {
      return failure(res, 409, "O aluno já possui um contrato ativo.");
    }
    const contract = await Contract.create({
      ...payload, id: crypto.randomUUID(), userId: req.body.userId,
      active: true, createdAt: todayInBrazil(), closedAt: null
    });
    try {
      await ensureMonthlyFeesForContract(contract);
    } catch (error) {
      /* O contrato é removido somente se não foram emitidas mensalidades. */
      const count = await MonthlyFee.countDocuments({ contractId: contract.id });
      if (count === 0) await Contract.deleteOne({ id: contract.id });
      throw error;
    }
    return res.status(201).json({ ok: true, contract });
  } catch (error) {
    console.error("Erro ao criar contrato:", error);
    return failure(res, 500, "Erro ao criar contrato.");
  }
};

export const updateContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({ id: req.params.id });
    if (!contract) return failure(res, 404, "Contrato não encontrado.");
    if (!contract.active) return failure(res, 409, "Não é possível editar um contrato encerrado.");
    if (getContractType(contract) === "Plano" &&
        (req.body.plan !== contract.plan || req.body.periodicity !== contract.periodicity)) {
      return failure(res, 409, "Não é possível trocar o plano ou duração de um contrato existente. Cadastre um novo contrato.");
    }
    let payload;
    try {
      const submitted = getContractType(contract) === "Plano"
        ? { ...req.body, baseValue: contract.baseValue, contractedValue: contract.contractedValue }
        : req.body;
      payload = normalizePayload(submitted, contract);
    }
    catch (error) { return failure(res, 400, error.message); }
    /* Mantém a regra atual: não reescrever histórico de contratos que já receberam pagamentos. */
    if (await hasPayments(contract.id)) {
      return failure(res, 409, "Este contrato possui pagamentos. Para preservar o histórico, não é possível alterar seus dados financeiros ou vigência.");
    }
    /* Edição atômica. Não muda IDs ou mensalidades canceladas.
       Mensalidades fora da nova vigência são canceladas, não apagadas. */
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const freshContract = await Contract.findOne({ id: contract.id }).session(session);
        if (!freshContract?.active) throw new Error("Contrato indisponível para edição.");
        if (await Payment.exists({ contractId: contract.id }).session(session)) {
          throw new Error("O contrato recebeu um pagamento durante a edição.");
        }
        Object.assign(freshContract, payload);
        await freshContract.save({ session });

        const expected = buildMonthlyFees(freshContract);
        const byReference = new Map(expected.map(fee => [fee.reference, fee]));
        const oldFees = await MonthlyFee.find({ contractId: contract.id }).session(session);
        const ops = [];
        for (const fee of oldFees) {
          const generated = byReference.get(fee.reference);
          if (generated) {
            byReference.delete(fee.reference);
            if (fee.status !== "cancelled") {
              ops.push({ updateOne: {
                filter: { id: fee.id },
                update: { $set: {
                  amount: generated.amount, number: generated.number,
                  periodStart: generated.periodStart, periodEnd: generated.periodEnd,
                  dueDate: generated.dueDate, status: generated.status
                } }
              } });
            }
          } else if (fee.status !== "cancelled") {
            ops.push({ updateOne: { filter: { id: fee.id }, update: { $set: { status: "cancelled" } } } });
          }
        }
        for (const generated of byReference.values()) {
          ops.push({ updateOne: {
            filter: { contractId: contract.id, reference: generated.reference },
            update: { $setOnInsert: generated }, upsert: true
          } });
        }
        if (ops.length) await MonthlyFee.bulkWrite(ops, { session, ordered: true });
        Object.assign(contract, freshContract.toObject());
      });
    } finally {
      await session.endSession();
    }
    return res.status(200).json({ ok: true, contract });
  } catch (error) {
    console.error("Erro ao editar contrato:", error);
    return failure(res, 500, "Erro ao editar contrato.");
  }
};

export const closeContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({ id: req.params.id });
    if (!contract) return failure(res, 404, "Contrato não encontrado.");
    if (!contract.active) return failure(res, 409, "Este contrato já está encerrado.");
    const today = todayInBrazil();
    contract.active = false;
    contract.closedAt = today;
    await contract.save();
    /* Impede que cobranças futuras, ainda não pagas, permaneçam exigíveis. */
    await MonthlyFee.updateMany({ contractId: contract.id, reference: { $gt: today.slice(0, 7) }, paidAmount: 0 }, { $set: { status: "cancelled" } });
    return res.status(200).json({ ok: true, contract });
  } catch (error) {
    console.error("Erro ao encerrar contrato:", error);
    return failure(res, 500, "Erro ao encerrar contrato.");
  }
};

export const deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({ id: req.params.id });
    if (!contract) return failure(res, 404, "Contrato não encontrado.");
    if (await hasPayments(contract.id)) return failure(res, 409, "Não é possível excluir um contrato que possui pagamentos.");
    await MonthlyFee.deleteMany({ contractId: contract.id });
    await Contract.deleteOne({ id: contract.id });
    return res.status(200).json({ ok: true, deletedId: contract.id });
  } catch (error) {
    console.error("Erro ao excluir contrato:", error);
    return failure(res, 500, "Erro ao excluir contrato.");
  }
};
