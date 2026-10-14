import crypto from "crypto";
import Contract from "../../models/Contract.js";
import MonthlyFee from "../../models/MonthlyFee.js";

/* Datas de competência são calculadas no calendário brasileiro, sem deslocamentos por UTC. */
export const todayInBrazil = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return month >= 1 && month <= 12 && day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
};

export const getContractType = (contract) => {
  if (contract?.contractType) return contract.contractType;
  if (contract?.specialCondition?.type === "Bolsa") return "Bolsista";
  if (contract?.specialCondition?.type === "Valor personalizado") return "Personalizado";
  return "Plano";
};

export const addMonthsSafe = (isoDate, count) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + count, 1));
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth() + 1;
  const maxDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(day, maxDay)).padStart(2, "0")}`;
};

export const lastDayOfMonth = (reference) => {
  const [year, month] = reference.split("-").map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${reference}-${String(day).padStart(2, "0")}`;
};

const previousDay = (isoDate) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - 1));
  return date.toISOString().slice(0, 10);
};

const monthDiff = (startReference, endReference) => {
  const [sy, sm] = startReference.split("-").map(Number);
  const [ey, em] = endReference.split("-").map(Number);
  return (ey - sy) * 12 + em - sm;
};

/* Produz as cobranças necessárias, sem consultar ou modificar o banco. */
export const buildMonthlyFees = (contract, { today = todayInBrazil(), futureMonths = 1 } = {}) => {
  if (!validDate(contract?.startDate) || getContractType(contract) === "Bolsista" ||
      !Number.isFinite(Number(contract.contractedValue)) || Number(contract.contractedValue) <= 0) return [];

  const startDate = contract.startDate;
  const indefinite = contract.indefinite === true || !contract.plannedEndDate;
  const referenceLimit = indefinite
    ? addMonthsSafe(`${today.slice(0, 7)}-01`, futureMonths).slice(0, 7)
    : contract.plannedEndDate.slice(0, 7);
  const months = monthDiff(startDate.slice(0, 7), referenceLimit);
  if (months < 0) return [];
  if (months > 1200) throw new Error("Intervalo do contrato excessivamente longo.");
  const fees = [];

  for (let index = 0; index <= months; index += 1) {
    const periodStart = addMonthsSafe(startDate, index);
    if (!indefinite && periodStart > contract.plannedEndDate) break;
    const nextStart = addMonthsSafe(startDate, index + 1);
    const reference = periodStart.slice(0, 7);
    const dueDate = lastDayOfMonth(reference);
    fees.push({
      id: crypto.randomUUID(), contractId: contract.id, userId: contract.userId,
      reference, number: index + 1, periodStart,
      periodEnd: previousDay(nextStart), dueDate,
      amount: Number(contract.contractedValue), paidAmount: 0,
      status: dueDate < today ? "overdue" : dueDate === today ? "pending" : "upcoming",
      createdAt: new Date().toISOString()
    });
  }
  return fees;
};

/* Idempotente: não substitui cobrança paga, editada, cancelada ou já existente. */
export const ensureMonthlyFeesForContract = async (contract, options = {}) => {
  if (!contract?.active || getContractType(contract) === "Bolsista") return 0;
  const fees = buildMonthlyFees(contract, options);
  if (!fees.length) return 0;
  try {
    const result = await MonthlyFee.bulkWrite(fees.map(fee => ({
      updateOne: {
        filter: { contractId: fee.contractId, reference: fee.reference },
        update: { $setOnInsert: fee }, upsert: true
      }
    })), { ordered: false });
    return result.upsertedCount || 0;
  } catch (error) {
    /* Em duas instâncias simultâneas, a chave única impede a duplicação. */
    if (error?.code === 11000 && !error?.writeErrors?.some(item => item.code !== 11000)) return 0;
    throw error;
  }
};

export const ensureMonthlyFeesForUser = async (userId) => {
  const contracts = await Contract.find({ userId, active: true }).lean();
  for (const contract of contracts) await ensureMonthlyFeesForContract(contract);
};

export const ensureAllActiveMonthlyFees = async () => {
  const cursor = Contract.find({ active: true }).cursor();
  let created = 0;
  for await (const contract of cursor) created += await ensureMonthlyFeesForContract(contract);
  return created;
};
