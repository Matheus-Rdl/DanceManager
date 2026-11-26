import { uuid, paymentToday, PAYMENT_METHODS } from "./privateLessonPaymentForm.js";
import { validContractDate } from "./privateLessonPurchaseForm.js";
const cents=v=>Math.round(v*100);
export function refundableAmount(summary,paymentId){
  const payment=summary.payments.find(p=>p.id===paymentId);
  if(!payment)return 0;
  return (cents(payment.amount)-(summary.refunds??[]).filter(r=>r.paymentId===paymentId).reduce((n,r)=>n+cents(r.amount),0))/100;
}
export function buildRefundPayload(form,pkg,summary,accounts,requestId,today=paymentToday()){
  if(pkg.status!=="cancelled"||!uuid(requestId))throw new Error("Cancele o pacote antes de devolver.");
  const payment=summary.payments.find(p=>p.id===form.paymentId), account=accounts.find(a=>a.id===form.accountId&&a.active===true);
  const raw=String(form.amount).trim().replace(",","."), amount=Number(raw);
  if(!payment||!account||!uuid(account.id)||!/^\d+(\.\d{1,2})?$/.test(raw)||!Number.isSafeInteger(cents(amount))||amount<=0||cents(amount)>cents(refundableAmount(summary,payment.id)))throw new Error("Selecione recebimento, conta ativa e valor disponível para devolver.");
  if(!validContractDate(form.refundedAt)||form.refundedAt>today||form.refundedAt<payment.receivedAt||!validContractDate(account.balanceDate)||form.refundedAt<=account.balanceDate)throw new Error("Data de devolução inválida.");
  if(!PAYMENT_METHODS.includes(form.method)||typeof form.reason!=="string"||!form.reason.trim()||form.reason.trim().length>500)throw new Error("Informe a forma de devolução e o motivo.");
  return {requestId,paymentId:payment.id,accountId:account.id,amount:cents(amount)/100,refundedAt:form.refundedAt,method:form.method,reason:form.reason.trim()};
}
/* EN: Recover uncertain operations with the same key after a reload in this tab.
   PT: Recupera operações incertas com a mesma chave após recarregar nesta aba. */
export function refundJournal(storage,pkgId,base=import.meta.env?.VITE_API_URL??""){
  const key=`dance-private-refund:${base}:${pkgId}`;
  return {read(){const raw=storage.getItem(key);if(raw===null)return null;const data=JSON.parse(raw);if(!data||![data.requestId,data.paymentId,data.accountId].every(uuid)||typeof data.amount!=="number"||data.amount<=0||!validContractDate(data.refundedAt)||!PAYMENT_METHODS.includes(data.method)||typeof data.reason!=="string"||!data.reason.trim())throw new Error("Devolução pendente inválida. Confira o histórico.");return data;},save(data){storage.setItem(key,JSON.stringify(data));},clear(){storage.removeItem(key);}};
}
