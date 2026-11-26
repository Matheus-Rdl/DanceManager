import { brazilPaymentDate, paymentCents, paymentError, paymentId, paymentSummary } from "../../models/privateLessonPaymentRules.js";
import { isValidLessonDate } from "../../models/privateLessonRules.js";
import { assertMatchingRevenue, privateLessonRevenueFields } from "./privateLessonRevenueIntegration.js";

const keys = ["requestId", "paymentId", "accountId", "amount", "refundedAt", "method", "reason"];
export function refundFields(body, today) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(k => !keys.includes(k))) throw paymentError("Campos de devolução inválidos.");
  if (![body.requestId, body.paymentId, body.accountId].every(paymentId)) throw paymentError("Identificadores inválidos.");
  if (!isValidLessonDate(body.refundedAt) || body.refundedAt > today) throw paymentError("Data da devolução inválida ou futura.");
  if (typeof body.method !== "string" || !body.method.trim() || body.method.trim().length > 70 || typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 500) throw paymentError("Informe a forma e o motivo da devolução.");
  return { requestId: body.requestId.toLowerCase(), paymentId: body.paymentId.toLowerCase(), accountId: body.accountId.toLowerCase(), amount: paymentCents(body.amount)/100, refundedAt: body.refundedAt, method: body.method.trim(), reason: body.reason.trim() };
}
export function refundExpenseFields(schoolId, pkg, refund) {
  const { id, amount, refundedAt, method, accountId, reason, createdAt } = refund;
  return { id, schoolId, sourceType:"privateLessonRefund", sourceId:id, recurrenceId:null,
    description:`Devolução de aulas particulares — ${pkg.name} (${pkg.id.slice(0,8)})`, category:"Devoluções de aulas particulares", initiator:null,
    amount, reference:refundedAt.slice(0,7), dueDate:refundedAt, status:"paid", paidAt:refundedAt, paidAmount:amount, method, accountId, notes:reason,
    history:[{ action:"created", at:createdAt, details:"Devolução integrada ao pacote", reason, before:null, after:{packageId:pkg.id, paymentId:refund.paymentId, refundId:id, amount, accountId, paidAt:refundedAt} }], createdAt, updatedAt:createdAt };
}
function assertExpense(row, expected) {
  if (!row || ["id","schoolId","sourceType","sourceId","category","amount","status","paidAmount","paidAt","method","accountId","reference","dueDate"].some(k=>row[k]!==expected[k])) throw paymentError("Devolução integrada inconsistente. Necessária conciliação financeira.",409);
}
/* EN: Register actual refunds only after cancellation, atomically with a paid expense.
   PT: Registra devoluções efetivas só após cancelamento, atomicamente com uma despesa paga. */
export default class PrivateLessonRefundIntegration {
  constructor({packageModel, accountModel, revenueModel, expenseModel, balanceService, resolveSchoolId, clock=()=>new Date()}) {
    Object.assign(this,{packageModel,accountModel,revenueModel,expenseModel,balanceService,resolveSchoolId,clock});
  }
  async refund(packageId, body) {
    if (!paymentId(packageId)) throw paymentError("Identificador da contratação inválido.");
    const now=this.clock(), today=brazilPaymentDate(now), fields=refundFields(body,today), schoolId=this.resolveSchoolId();
    const scope={schoolId,id:packageId};
    const session=await this.packageModel.db.startSession();
    try {
      let result;
      await session.withTransaction(async()=>{
        const pkg=await this.packageModel.findOne(scope).session(session).lean();
        if (!pkg) throw paymentError("Contratação não encontrada.",404);
        const summary=paymentSummary(pkg);
        const original=(pkg.payments??[]).find(p=>p.id===fields.paymentId);
        if (!original) throw paymentError("Recebimento não encontrado.",404);
        const revenueFields=privateLessonRevenueFields(schoolId,packageId,original,pkg.name);
        assertMatchingRevenue(await this.revenueModel.findOne({schoolId,sourceType:revenueFields.sourceType,sourceId:original.id}).session(session).lean(),revenueFields);
        const previous=(pkg.refunds??[]).find(r=>r.requestId===fields.requestId);
        if (previous) {
          if (keys.some(k=>previous[k]!==fields[k])) throw paymentError("Chave de devolução já utilizada com outros dados.",409);
          assertExpense(await this.expenseModel.findOne({schoolId,id:previous.id}).session(session).lean(),refundExpenseFields(schoolId,pkg,previous));
          result={packageId,refund:previous,summary,expenseId:previous.id,replayed:true};return;
        }
        if (pkg.status!=="cancelled") throw paymentError("Cancele o pacote antes de registrar a devolução.",409);
        if (fields.refundedAt<original.receivedAt) throw paymentError("A devolução não pode anteceder o recebimento.");
        if (!pkg.cancelledAt || fields.refundedAt<brazilPaymentDate(new Date(pkg.cancelledAt))) throw paymentError("A devolução não pode anteceder o cancelamento.");
        const refunded=(pkg.refunds??[]).filter(r=>r.paymentId===original.id).reduce((sum,r)=>sum+paymentCents(r.amount),0);
        if (paymentCents(fields.amount)>paymentCents(original.amount)-refunded) throw paymentError("Devolução superior ao valor ainda não devolvido deste recebimento.",409);
        if (!Number.isSafeInteger(pkg.__v)||pkg.__v<0) throw paymentError("Versão da contratação inválida.",409);
        const account=await this.accountModel.findOneAndUpdate({schoolId,id:fields.accountId,active:true,balanceDate:{$lt:fields.refundedAt}},{$inc:{__v:1}},{session,new:true}).lean();
        if (!account) throw paymentError("Conta indisponível ou data anterior ao saldo inicial.",409);
        const balances=await this.balanceService.getBalances({asOf:today},{session});
        const source=balances.accounts.find(a=>a.id===fields.accountId);
        if (!source?.available||!Number.isFinite(source.balance)||Math.round(source.balance*100)<paymentCents(fields.amount)) throw paymentError("Saldo atual insuficiente ou indisponível na conta.",409);
        const refund={...fields,id:fields.requestId,createdAt:now.toISOString()};
        const updated=await this.packageModel.findOneAndUpdate({...scope,status:"cancelled",__v:pkg.__v,"refunds.requestId":{$ne:fields.requestId}},{$push:{refunds:refund},$inc:{__v:1},$set:{updatedAt:refund.createdAt}},{session,new:true,runValidators:true}).lean();
        if(!updated) throw paymentError("Pacote alterado. Confira o histórico e tente novamente.",409);
        await this.expenseModel.create([refundExpenseFields(schoolId,pkg,refund)],{session});
        result={packageId,refund,summary:paymentSummary(updated),expenseId:refund.id,replayed:false};
      },{readConcern:{level:"snapshot"},writeConcern:{w:"majority"}});
      return result;
    } catch(error) {
      if(error?.code===11000) throw paymentError("Conflito de identificador. Confira o histórico antes de repetir.",409);
      throw error;
    } finally { await session.endSession(); }
  }
}
