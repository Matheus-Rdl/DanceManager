import { validContractDate } from "./privateLessonPurchaseForm.js";

export const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão", "Transferência", "Boleto", "Outro"];
export const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function paymentToday(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const cents = value => typeof value === "number" && Number.isSafeInteger(Math.round(value*100)) && Math.abs(value*100-Math.round(value*100))<1e-7 && value>=0 ? Math.round(value*100) : NaN;
export const emptyPayment = () => ({amount:"",receivedAt:paymentToday(),method:"Pix",accountId:"",notes:""});
export const activeAccounts = rows => { if (!Array.isArray(rows)) throw new Error("Lista de contas inválida."); return rows.filter(a=>a.active===true && uuid(a.id) && validContractDate(a.balanceDate)); };
export const canReceive = (pkg, summary) => ["active","completed"].includes(pkg.status) && cents(summary?.outstandingAmount)>0;
/* EN: Reject malformed or inconsistent balances rather than displaying a false zero.
   PT: Rejeita saldos inválidos ou inconsistentes em vez de mostrar zero incorretamente. */
export function validatePaymentSummary(summary) {
  const total=cents(summary?.contractedAmount), paid=cents(summary?.paidAmount), due=cents(summary?.outstandingAmount);
  if (!(total>0) || paid+due!==total || summary.paymentStatus!==(paid===0?"pending":due===0?"paid":"partial") || !Number.isSafeInteger(summary.paymentCount) || summary.paymentCount<0) throw new Error("Resumo financeiro inválido.");
  return summary;
}
export function buildPaymentPayload(form,pkg,summary,accounts,requestId,today=paymentToday()) {
  validatePaymentSummary(summary);
  if (!canReceive(pkg,summary)) throw new Error("Pacote sem saldo disponível para recebimento.");
  const raw=String(form.amount).trim().replace(",","."), amount=Number(raw), value=cents(amount);
  if (!/^\d+(\.\d{1,2})?$/.test(raw)||!(value>0)||value>cents(summary.outstandingAmount)) throw new Error("Informe um valor positivo de até duas casas decimais, limitado ao saldo em aberto.");
  const account=accounts.find(a=>a.id===form.accountId && a.active===true && uuid(a.id));
  if (!account) throw new Error("Selecione uma conta financeira ativa.");
  if (!validContractDate(form.receivedAt)||!validContractDate(today)||!validContractDate(pkg.contractedOn)||!validContractDate(account.balanceDate)||form.receivedAt>today||form.receivedAt<pkg.contractedOn||form.receivedAt<=account.balanceDate) throw new Error("Data inválida: deve ser a partir da contratação, até hoje e posterior à referência do saldo da conta.");
  if (!PAYMENT_METHODS.includes(form.method)||typeof form.notes!=="string"||form.notes.trim().length>500||!uuid(requestId)) throw new Error("Forma de pagamento, observações ou operação inválida.");
  return {requestId,amount:value/100,receivedAt:form.receivedAt,method:form.method,accountId:account.id,notes:form.notes.trim()};
}
export const paymentMatches = (payment,payload) => !!payment && ["requestId","amount","receivedAt","method","accountId","notes"].every(k=>payment[k]===payload[k]);
export const knownPaymentRejection = err => [400,403,404,409,422].includes(err?.status);
/* EN: Persist an unresolved operation before sending, so a reload can retry the same request rather than creating another receipt.
   PT: Persiste uma operação não resolvida antes do envio, permitindo repetir a mesma chave após recarregar sem criar outro recebimento. */
export function paymentJournal(storage,packageId,base=import.meta.env?.VITE_API_URL??"") {
  const key=`dance-private-payment:${base}:${packageId}`;
  return {
    read(){const raw=storage.getItem(key);if(raw===null)return null;const data=JSON.parse(raw);if(!uuid(data?.requestId)||!(cents(data.amount)>0)||!uuid(data.accountId)||!validContractDate(data.receivedAt)||!PAYMENT_METHODS.includes(data.method)||typeof data.notes!=="string")throw new Error("Operação pendente inválida. Necessária conferência financeira.");return data;},
    save(data){storage.setItem(key,JSON.stringify(data));},
    clear(){storage.removeItem(key);}
  };
}
