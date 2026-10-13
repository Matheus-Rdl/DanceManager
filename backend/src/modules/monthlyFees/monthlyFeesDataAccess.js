
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
    const today = new Date().toISOString().slice(0, 10);

    if (amount > 0 && paid >= amount) return "paid";
    if (paid > 0) return "partial";
    if (fee.dueDate < today) return "overdue";
    if (fee.dueDate === today) return "pending";
    return "upcoming";
  }

  /* Busca mensalidades e adiciona informações dos alunos */
  async getMonthlyFees(filters = {}) {
    const query = {};

    if (filters.reference) query.reference = filters.reference;
    if (filters.userId) query.userId = filters.userId;
    if (filters.contractId) query.contractId = filters.contractId;

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
