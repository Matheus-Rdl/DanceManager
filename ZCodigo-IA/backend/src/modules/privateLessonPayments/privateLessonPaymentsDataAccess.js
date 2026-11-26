import { randomUUID } from "node:crypto";
import { brazilPaymentDate, paymentCents, paymentError, paymentFields, paymentId, paymentSummary, samePaymentRequest } from "../../models/privateLessonPaymentRules.js";
import { isValidLessonDate } from "../../models/privateLessonRules.js";

/* EN: The caller must own a Mongo transaction and write the matching revenue before commit.
   PT: O chamador deve controlar uma transação Mongo e gravar o provento correspondente antes de confirmar. */
export default class PrivateLessonPaymentsDataAccess {
  constructor({ packageModel, accountModel, resolveSchoolId, makeId = randomUUID, clock = () => new Date() }) {
    Object.assign(this, { packageModel, accountModel, resolveSchoolId, makeId, clock });
  }
  async get(id) {
    if (!paymentId(id)) throw paymentError("Identificador da contratação inválido.");
    const pkg = await this.packageModel.findOne({ schoolId: this.resolveSchoolId(), id }).lean();
    if (!pkg) throw paymentError("Contratação não encontrada.", 404);
    return { packageId: pkg.id, ...paymentSummary(pkg), payments: pkg.payments ?? [], ...(pkg.refunds?.length ? { refunds: pkg.refunds } : {}) };
  }
  async appendInTransaction(id, body, session) {
    if (!session || typeof session.inTransaction !== "function" || !session.inTransaction()) throw paymentError("Recebimentos exigem uma transação financeira ativa.", 409);
    if (!paymentId(id)) throw paymentError("Identificador da contratação inválido.");
    const now = this.clock();
    const fields = paymentFields(body, brazilPaymentDate(now));
    const scope = { schoolId: this.resolveSchoolId(), id };
    const pkg = await this.packageModel.findOne(scope).session(session).lean();
    if (!pkg) throw paymentError("Contratação não encontrada.", 404);
    const summary = paymentSummary(pkg);
    const existing = (pkg.payments ?? []).find(p => p.requestId === fields.requestId);
    /* EN: A retry with the same key and same data returns the original receipt, even after account deactivation.
       PT: Um reenvio com a mesma chave e os mesmos dados retorna o recebimento original, mesmo após desativação da conta. */
    if (existing) {
      if (!samePaymentRequest(existing, fields)) throw paymentError("Identificador da operação já utilizado com outros dados.", 409);
      return { packageId: id, packageName: pkg.name, payment: existing, summary, replayed: true };
    }
    if (!["active", "completed"].includes(pkg.status)) throw paymentError("Pacote não permite novos pagamentos.", 409);
    if (!isValidLessonDate(pkg.contractedOn) || fields.receivedAt < pkg.contractedOn) throw paymentError("Recebimento não pode anteceder a contratação.");
    if (paymentCents(fields.amount) > Math.round(summary.outstandingAmount * 100)) throw paymentError("Pagamento superior ao saldo em aberto.", 409);
    const account = await this.accountModel.findOne({ schoolId: scope.schoolId, id: fields.accountId, active: true }).session(session).lean();
    if (!account) throw paymentError("Conta financeira inexistente, inativa ou de outra escola.", 404);
    /* EN: The existing balance calculation excludes receipts on or before the opening balance day.
       PT: O cálculo de saldo existente exclui recebimentos na data de referência ou antes dela. */
    if (!isValidLessonDate(account.balanceDate) || fields.receivedAt <= account.balanceDate) throw paymentError("Recebimento deve ser posterior à data de referência do saldo da conta.", 409);
    const payment = { ...fields, id: this.makeId(), createdAt: now.toISOString() };
    if (!paymentId(payment.id) || (pkg.payments ?? []).some(p => p.id === payment.id)) throw paymentError("Conflito no identificador do pagamento.", 409);
    /* EN: Compare the package version to prevent concurrent payments from exceeding the amount owed.
       PT: Compara a versão do pacote para impedir que pagamentos simultâneos excedam o saldo devido. */
    if (!Number.isSafeInteger(pkg.__v) || pkg.__v < 0) throw paymentError("Versão da contratação inválida.", 409);
    const updated = await this.packageModel.findOneAndUpdate({ ...scope, __v: pkg.__v, status: pkg.status, "payments.requestId": { $ne: fields.requestId } },
      { $push: { payments: payment }, $set: { updatedAt: payment.createdAt }, $inc: { __v: 1 } },
      { new: true, runValidators: true, session }).lean();
    if (!updated) throw paymentError("Pacote alterado por outra operação. Atualize os dados e tente novamente com a mesma chave.", 409);
    return { packageId: id, packageName: pkg.name, payment, summary: paymentSummary(updated), replayed: false };
  }
}
