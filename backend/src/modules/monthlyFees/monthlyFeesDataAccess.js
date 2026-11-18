import { ensureMonthlyFeesForUser, ensureAllActiveMonthlyFees, todayInBrazil } from "./monthlyFeeGeneration.js";

import mongoose from "mongoose";
import MonthlyFee from "../../models/MonthlyFee.js";
import Payment from "../../models/Payment.js";
import User from "../../models/User.js";
import Contract from "../../models/Contract.js";

export default class MonthlyFeesDataAccess {
  /* Calcula o status atual da mensalidade */
  getStatus(fee) {
    if (fee.status === "cancelled") return "cancelled";

    const amount = Number(fee.amount || 0);
    const paid = Number(fee.paidAmount || 0);
    const today = todayInBrazil();

    if (amount > 0 && paid >= amount) return "paid";
    if (paid > 0) return "partial";
    if (fee.dueDate < today) return "overdue";
    if (fee.dueDate === today) return "pending";
    return "upcoming";
  }

  /* Busca mensalidades e adiciona informações dos alunos */
  async getMonthlyFees(filters = {}) {
    /* Atualiza automaticamente a janela de competência antes da consulta. */
    if (filters.userId) await ensureMonthlyFeesForUser(filters.userId);
    else await ensureAllActiveMonthlyFees();

    const query = {};

    if (filters.reference) query.reference = filters.reference;
    if (filters.userId) query.userId = filters.userId;
    if (filters.contractId) query.contractId = filters.contractId;
    if (filters.overdueOnly === true) {
      /* Mesmo critério do Dashboard: não cancelada, vencimento passado e saldo positivo.
         Inclui mensalidades parcialmente pagas que continuam vencidas. */
      query.status = { $ne: "cancelled" };
      query.dueDate = { $lt: todayInBrazil() };
      query.$expr = { $gt: ["$amount", { $ifNull: ["$paidAmount", 0] }] };
    }

    /* Filtra mensalidades pelos usuários vinculados à turma.
       As cobranças continuam sendo do CONTRATO do aluno, não da atividade. */
    if (filters.activityMat) {
      const mat = String(filters.activityMat).trim();
      const enrolledUsers = await User.find({ $or: [
        { user_activities: mat },
        { "user_activities.activity_mat": mat },
        { "user_activities.activityMat": mat }
      ] }).select("_id user_type").lean();
      /* O cadastro pode conter professores: limita o financeiro aos alunos/bolsistas. */
      const allowedIds = enrolledUsers.filter(user => {
        const types = Array.isArray(user.user_type) ? user.user_type : [user.user_type];
        const valid = types.filter(type => type !== undefined && type !== null);
        return valid.length === 0 || valid.some(type => [1, 2].includes(Number(type)));
      }).map(user => String(user._id));
      if (filters.userId) {
        query.userId = allowedIds.includes(String(filters.userId)) ? String(filters.userId) : { $in: [] };
      } else {
        query.userId = { $in: allowedIds };
      }
    }

    const fees = await MonthlyFee.find(query)
      .sort(filters.overdueOnly === true ? { dueDate: -1, number: 1 } : { dueDate: 1, number: 1 })
      .lean();

    const userIds = [...new Set(fees.map(fee => fee.userId))]
      .filter(id => mongoose.isValidObjectId(id));

    const contractIds = [...new Set(fees.map(fee => fee.contractId))];

    /* EN: Load payment dates in one query for the selected competency. Reversed payments never count.
       PT: Busca datas dos pagamentos da competência em uma consulta; estornos não entram no cálculo. */
    const paymentIds = filters.reference ? fees.filter(fee => fee.status !== "cancelled").map(fee => fee.id) : [];
    const [users, contracts, payments] = await Promise.all([
      User.find({ _id: { $in: userIds } }).lean(),
      Contract.find({ id: { $in: contractIds } }).lean(),
      paymentIds.length
        ? Payment.find({ monthlyFeeId: { $in: paymentIds }, status: { $ne: "reversed" } })
          .select("monthlyFeeId amount paidAt").lean()
        : Promise.resolve([])
    ]);

    /* EN: Sum only payments received on/before each fee's due date, using cents for precision.
       PT: Soma somente pagamentos até o vencimento de cada mensalidade, em centavos. */
    const feesById = new Map(fees.map(fee => [String(fee.id), fee]));
    const onTimeCents = new Map();
    for (const payment of payments) {
      const id = String(payment.monthlyFeeId);
      const fee = feesById.get(id);
      const paidDate = String(payment.paidAt || "").slice(0, 10);
      const dueDate = String(fee?.dueDate || "").slice(0, 10);
      if (!fee || !/^\d{4}-\d{2}-\d{2}$/.test(paidDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || paidDate > dueDate) continue;
      const cents = Math.round(Number(payment.amount || 0) * 100);
      if (!Number.isFinite(cents) || cents <= 0) continue;
      onTimeCents.set(id, (onTimeCents.get(id) || 0) + cents);
    }
    const today = todayInBrazil();

    const usersMap = new Map(
      users.map(user => [String(user._id), user])
    );

    const contractsMap = new Map(
      contracts.map(contract => [contract.id, contract])
    );

    return fees.map(fee => {
      const user = usersMap.get(String(fee.userId));
      const contract = contractsMap.get(fee.contractId);

      const feeAmountCents = Math.round(Number(fee.amount || 0) * 100);
      const receivedCents = Math.round(Number(fee.paidAmount || 0) * 100);
      const validFee = fee.status !== "cancelled";
      return {
        ...fee,
        status: this.getStatus(fee),
        /* EN: A fee is paid on time only when its full amount was received by its due date.
           PT: Uma mensalidade só é pontual quando totalmente quitada até o vencimento. */
        paidOnTime: validFee && feeAmountCents > 0 && receivedCents >= feeAmountCents
          && (onTimeCents.get(String(fee.id)) || 0) >= feeAmountCents,
        /* EN: Include overdue partial payments in the delinquency count.
           PT: Inclui mensalidades parcialmente pagas e vencidas na inadimplência. */
        hasOverdueBalance: validFee && feeAmountCents > receivedCents && String(fee.dueDate || "").slice(0, 10) < today,
        ...(filters.overdueOnly === true ? {
          remainingAmount: Math.round(Math.max(0, Number(fee.amount || 0) - Number(fee.paidAmount || 0)) * 100) / 100,
          daysOverdue: Math.max(0, Math.round((Date.parse(`${todayInBrazil()}T00:00:00Z`) - Date.parse(`${String(fee.dueDate).slice(0, 10)}T00:00:00Z`)) / 86400000))
        } : {}),
        student: {
          id: user?.user_mat || "",
          userId: fee.userId,
          name: user?.user_name || "Usuário não encontrado",
          activity: user?.user_activity || "-",
          avatar: user?.user_avatar || "",
          contract: contract?.plan || contract?.contractType || "Contrato",
          monthlyAmount: fee.amount,
          periodicity: contract?.periodicity || "-",
          contractStart: contract?.startDate || "",
          contractEnd: contract?.plannedEndDate || ""
        }
      };
    });
  }

  /* Não depende de uma competência: recupera os atrasos de todos os anos. */
  async getOverdueMonthlyFees() {
    return this.getMonthlyFees({ overdueOnly: true });
  }

  /* Busca mensalidade específica */
  async getMonthlyFee(feeId) {
    const fee = await MonthlyFee.findOne({ id: feeId }).lean();
    if (!fee) return null;

    return {
      ...fee,
      status: this.getStatus(fee)
    };
  }
}
