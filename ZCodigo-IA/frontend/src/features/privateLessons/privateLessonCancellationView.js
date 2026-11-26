import { uuid, validatePaymentSummary } from "./privateLessonPaymentForm.js";
import { validInstant } from "./privateLessonSchedulingView.js";

/* EN: Validate the server preview and require explicit confirmation with a reason.
   PT: Valida a prévia do servidor e exige confirmação explícita com motivo. */
export function validateCancellationPreview(row, id) {
  if (row?.packageId !== id || !Number.isSafeInteger(row.version) || row.version < 0 || !Number.isSafeInteger(row.lessonCount) || row.lessonCount < 1 || ![row.completedCount,row.scheduledCount,row.remainingCount,row.availableToSchedule].every(n=>Number.isSafeInteger(n)&&n>=0) || row.remainingCount!==row.lessonCount-row.completedCount || row.availableToSchedule!==row.remainingCount-row.scheduledCount) throw new Error("Prévia de cancelamento inválida.");
  validatePaymentSummary(row);
  const cents=n=>Math.round(n*100);
  if (![row.usedAmount,row.unusedAmount,row.suggestedRefund].every(n=>typeof n==="number"&&Number.isFinite(n)&&n>=0) || cents(row.usedAmount)+cents(row.unusedAmount)!==cents(row.contractedAmount) || cents(row.suggestedRefund)!==Math.max(0,cents(row.paidAmount)-cents(row.usedAmount))) throw new Error("Valores da prévia inconsistentes.");
  return row;
}
export function buildCancellationPayload(preview, reason, requestId) {
  if (!uuid(requestId) || !Number.isSafeInteger(preview?.version) || preview.version < 0 || typeof reason!=="string" || !reason.trim() || reason.trim().length>1000) throw new Error("Informe um motivo de cancelamento de até 1000 caracteres.");
  return {version:preview.version,reason:reason.trim(),requestId};
}
export function validateCancellationResult(row,id,data) {
  if(row?.packageId!==id||row.packageStatus!=="cancelled"||row.requestId!==data.requestId||row.reason!==data.reason||!validInstant(row.cancelledAt)||typeof row.replayed!=="boolean"||row.summary?.scheduledCount!==0||row.summary?.availableToSchedule!==0) throw new Error("Cancelamento não confirmado pelo servidor. Confira a contratação antes de repetir.");
  return row;
}
