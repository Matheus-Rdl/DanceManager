import { ensureMonthlyFeesForUser, ensureAllActiveMonthlyFees, todayInBrazil } from "./monthlyFeeGeneration.js";

import mongoose from "mongoose";
import MonthlyFee from "../../models/MonthlyFee.js";
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
      .sort({ dueDate: 1, number: 1 })
      .lean();

    const userIds = [...new Set(fees.map(fee => fee.userId))]
      .filter(id => mongoose.isValidObjectId(id));

    const contractIds = [...new Set(fees.map(fee => fee.contractId))];

    const [users, contracts] = await Promise.all([
      User.find({ _id: { $in: userIds } }).lean(),
      Contract.find({ id: { $in: contractIds } }).lean()
    ]);

    const usersMap = new Map(
      users.map(user => [String(user._id), user])
    );

    const contractsMap = new Map(
      contracts.map(contract => [contract.id, contract])
    );

    return fees.map(fee => {
      const user = usersMap.get(String(fee.userId));
      const contract = contractsMap.get(fee.contractId);

      return {
        ...fee,
        status: this.getStatus(fee),
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
