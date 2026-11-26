import { paymentError, paymentId } from "../../models/privateLessonPaymentRules.js";

/* EN: One settled revenue per receipt, not per participant or package. The required revenue dueDate is the actual receipt date, never an outstanding obligation.
   PT: Um provento recebido por pagamento, não por participante ou pacote. A data obrigatória do provento é a data efetiva do recebimento, nunca um vencimento em aberto. */
export const PRIVATE_LESSON_REVENUE_SOURCE = "privateLesson";
export function privateLessonRevenueFields(schoolId, packageId, payment, packageName) {
  const { id, amount, receivedAt, method, accountId, notes, createdAt } = payment;
  return {
    id, schoolId, sourceType: PRIVATE_LESSON_REVENUE_SOURCE, sourceId: id,
    description: `Aulas particulares — ${packageName || "Pacote"} (${packageId.slice(0, 8)})`, category: "Aulas particulares",
    initiator: null, amount, reference: receivedAt.slice(0, 7), dueDate: receivedAt,
    status: "received", receivedAt, receivedAmount: amount, method, accountId, notes,
    history: [{ action: "created", at: createdAt, details: `Recebimento integrado ao pacote ${packageId}`, reason: "", before: null, after: { packageId, paymentId: id, amount, receivedAt, accountId, method } }],
    createdAt, updatedAt: createdAt
  };
}

/* EN: Never repair a missing or inconsistent revenue on replay: fail closed for reconciliation.
   PT: Nunca recria proventos ausentes ou inconsistentes num reenvio: bloqueia para conciliação. */
export function assertMatchingRevenue(revenue, fields) {
  const keys = ["id", "schoolId", "sourceType", "sourceId", "category", "status", "amount", "receivedAmount", "receivedAt", "accountId", "method", "reference", "dueDate"];
  if (!revenue || keys.some(key => revenue[key] !== fields[key])) throw paymentError("Recebimento integrado inconsistente. Necessária conciliação financeira.", 409);
}

export default class PrivateLessonRevenueIntegration {
  constructor({ paymentAccess, packageModel, accountModel, revenueModel, resolveSchoolId }) {
    Object.assign(this, { paymentAccess, packageModel, accountModel, revenueModel, resolveSchoolId });
  }
  async receive(packageId, body) {
    if (!paymentId(packageId)) throw paymentError("Identificador da contratação inválido.");
    const school = this.resolveSchoolId();
    const session = await this.packageModel.db.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const receipt = await this.paymentAccess.appendInTransaction(packageId, body, session);
        const fields = privateLessonRevenueFields(school, packageId, receipt.payment, receipt.packageName);
        if (receipt.replayed) {
          const existing = await this.revenueModel.findOne({ schoolId: school, sourceType: fields.sourceType, sourceId: fields.sourceId }).session(session).lean();
          assertMatchingRevenue(existing, fields);
        } else {
          /* EN: Serialize with account edits and transfers using the existing account version lock.
             PT: Serializa com edições de conta e transferências usando o bloqueio de versão existente. */
          const account = await this.accountModel.findOneAndUpdate({ schoolId: school, id: fields.accountId, active: true, balanceDate: { $lt: fields.receivedAt } },
            { $inc: { __v: 1 } }, { session, new: true }).lean();
          if (!account) throw paymentError("Conta financeira alterada ou indisponível para recebimento.", 409);
          await this.revenueModel.create([fields], { session });
        }
        result = { ...receipt, revenueId: fields.id };
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      return result;
    } catch (error) {
      if (error?.code === 11000) throw paymentError("Conflito no identificador financeiro. Nenhum novo recebimento foi confirmado.", 409);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
