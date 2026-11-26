import { validatePaymentSummary, uuid } from "./privateLessonPaymentForm.js";
import { validContractDate } from "./privateLessonPurchaseForm.js";

export const paymentStatusLabel = status => ({pending:"Pendente",partial:"Parcial",paid:"Quitado"})[status] || "—";
const cents = value => Math.round(value * 100);
const add = (a,b) => { const total=a+b; if(!Number.isSafeInteger(total)) throw new Error("Total financeiro inválido."); return total; };
/* EN: These are receipts for selected purchases, not cash flow within the selected contract dates.
   PT: São recebimentos das contratações selecionadas, não o fluxo de caixa dentro das datas de contratação. */
export function summarizeFinancialPackages(rows) {
  let received=0, outstanding=0, pendingCount=0;
  const seen=new Set();
  for(const row of rows){
    if(!row.id || seen.has(row.id)) throw new Error("Contratação duplicada ou inválida.");
    seen.add(row.id);
    const f=validatePaymentSummary(row.financial);
    if(f.contractedAmount!==row.amount || !["active","completed","cancelled"].includes(row.status)) throw new Error("Resumo financeiro incompatível com a contratação.");
    received=add(received,cents(f.paidAmount));
    if(row.status!=="cancelled"){
      outstanding=add(outstanding,cents(f.outstandingAmount));
      if(f.outstandingAmount>0)pendingCount++;
    }
  }
  return {received:received/100,outstanding:outstanding/100,pendingCount};
}
/* EN: Verify the complete journal before displaying or reconciling a receipt.
   PT: Confere o histórico completo antes de exibir ou conciliar um recebimento. */
export function validatePaymentHistory(summary) {
  validatePaymentSummary(summary);
  if(!Array.isArray(summary.payments)||summary.paymentCount!==summary.payments.length) throw new Error("Histórico financeiro inválido.");
  const ids=new Set(), requests=new Set();let paid=0;
  for(const p of summary.payments){
    if(!uuid(p?.id)||!uuid(p.requestId)||!uuid(p.accountId)||ids.has(p.id.toLowerCase())||requests.has(p.requestId.toLowerCase())||!validContractDate(p.receivedAt)||typeof p.method!=="string"||!p.method.trim()||typeof p.notes!=="string"||typeof p.amount!=="number"||!Number.isSafeInteger(cents(p.amount))||p.amount<=0||Math.abs(p.amount*100-cents(p.amount))>=1e-7) throw new Error("Histórico financeiro inválido.");
    ids.add(p.id.toLowerCase());requests.add(p.requestId.toLowerCase());paid=add(paid,cents(p.amount));
  }
  if(paid!==cents(summary.paidAmount))throw new Error("Histórico financeiro não corresponde ao total recebido.");
  return summary;
}
export function orderedPayments(summary) {
  return [...validatePaymentHistory(summary).payments].sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)||String(b.createdAt??"").localeCompare(String(a.createdAt??""))||a.id.localeCompare(b.id));
}
export function paymentAccountLabel(accounts, accountId) {
  const account=accounts.find(a=>a.id===accountId);
  return account?.name ? `${account.name}${account.active===false?" (inativa)":""}` : `Conta não localizada (${accountId})`;
}
