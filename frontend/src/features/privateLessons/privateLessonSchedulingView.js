import { uuid } from "./privateLessonPaymentForm.js";
import { validContractDate } from "./privateLessonPurchaseForm.js";

const zone = "America/Sao_Paulo";
const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" });
export const lessonLabels = { scheduled:"Agendada", completed:"Realizada", absent:"Falta", cancelled:"Cancelada" };
export const validInstant = value => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
/* EN: Interpret wall-clock inputs in the school timezone, independently of the browser timezone.
   PT: Interpreta horários no fuso da escola, independentemente do fuso do navegador. */
export function schoolLocal(value) {
  const p = Object.fromEntries(formatter.formatToParts(new Date(value)).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function localToUTC(value) {
  if (typeof value!=="string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) || !validContractDate(value.slice(0,10))) throw new Error("Informe data e horário válidos.");
  const nominal=Date.parse(`${value}:00Z`);
  if (!Number.isFinite(nominal)) throw new Error("Horário inválido.");
  const candidates=new Set();
  for (const delta of [-86400000,0,86400000]) {
    const sample=nominal+delta, offset=Date.parse(`${schoolLocal(sample)}:00Z`)-sample;
    const instant=nominal-offset;
    if(schoolLocal(instant)===value) candidates.add(instant);
  }
  if(candidates.size!==1) throw new Error("Horário inexistente ou ambíguo no fuso de São Paulo.");
  return new Date([...candidates][0]).toISOString();
}
export function defaultEnd(start, minutes=60) {
  try { return schoolLocal(Date.parse(localToUTC(start))+minutes*60000); } catch { return ""; }
}
export function displayLessonTime(instant) {
  const local=schoolLocal(instant); return `${local.slice(8,10)}/${local.slice(5,7)}/${local.slice(0,4)} às ${local.slice(11)}`;
}
export function validateLessonList(data,id) {
  if(data?.packageId!==id || !["active","completed","cancelled"].includes(data.packageStatus) || !Array.isArray(data.lessons) || !Number.isSafeInteger(data.lessonCount)||data.lessonCount<1) throw new Error("Resposta da agenda inválida.");
  const counts={scheduled:0,completed:0,absent:0,cancelled:0}, ids=new Set();
  for(const l of data.lessons) {
    if(!l||!uuid(l.id)||l.packageId!==id||ids.has(l.id)||!Object.hasOwn(counts,l.status)||!validInstant(l.startsAt)||!validInstant(l.endsAt)||l.startsAt>=l.endsAt) throw new Error("Histórico de aulas inválido.");
    ids.add(l.id);counts[l.status]++;
  }
  for(const k of Object.keys(counts)) if(data[`${k}Count`]!==counts[k]) throw new Error("Contagem de aulas inconsistente.");
  const remaining=data.lessonCount-counts.completed, free=remaining-counts.scheduled;
  if(free<0||data.remainingCount!==remaining||data.availableToSchedule!==(data.packageStatus==="active"?free:0)) throw new Error("Disponibilidade de aulas inconsistente.");
  return data;
}
export function lessonActions(lesson, data, now=Date.now()) {
  if(data.packageStatus!=="active") return [];
  const replaced=data.lessons.some(l=>l.rescheduledFromId===lesson.id);
  if(lesson.status==="scheduled") return [...(Date.parse(lesson.endsAt)<=now?["completed","absent"]:[]),"cancelled",...(!replaced?["reschedule"]:[])];
  return lesson.status==="absent"&&!replaced&&data.availableToSchedule>0?["reschedule"]:[];
}
export function buildSchedulePayload(form,pkg,data,target,requestId) {
  if(data.packageStatus!=="active"||!uuid(requestId)) throw new Error("Pacote ou operação inválida.");
  if(target&&!lessonActions(target,data).includes("reschedule")) throw new Error("Aula indisponível para reagendamento.");
  const count=target?1:Number(form.count);
  if(!Number.isSafeInteger(count)||count<1||count>100||(!target&&count>data.availableToSchedule)) throw new Error("Quantidade acima do limite disponível (máximo de 100 por operação).");
  const startsAt=localToUTC(form.start),endsAt=localToUTC(form.end);
  if(startsAt>=endsAt||form.start.slice(0,10)<pkg.contractedOn) throw new Error("O término deve ser posterior ao início e a aula não pode anteceder a contratação.");
  if(typeof form.notes!=="string"||form.notes.trim().length>1000) throw new Error("Observações devem ter até 1000 caracteres.");
  return {requestId,startsAt,endsAt,notes:form.notes.trim(),allowConflicts:false,...(count>1?{count}:{})};
}
export function conflictDetails(err) {
  if(err?.status!==409||err.code!=="LESSON_SCHEDULE_CONFLICT"||!Array.isArray(err.conflicts)||!err.conflicts.length) return [];
  return err.conflicts.every(c=>c&&[c.requestedStartsAt,c.requestedEndsAt,c.startsAt,c.endsAt].every(validInstant)&&c.requestedStartsAt<c.requestedEndsAt&&c.startsAt<c.endsAt)?err.conflicts:[];
}
/* EN: Persist uncertain writes before sending; retry only the original payload.
   PT: Persiste gravações incertas antes do envio; repete apenas o payload original. */
export function scheduleJournal(storage,id,base=import.meta.env?.VITE_API_URL??"") {
  const key=`dance-private-schedule:${base}:${id}`;
  return {read(){const raw=storage.getItem(key);if(raw===null)return null;const op=JSON.parse(raw);if(!validOperation(op))throw new Error("Operação de agenda pendente inválida. Confira os registros.");return op;},save(op){if(!validOperation(op))throw new Error("Operação inválida.");storage.setItem(key,JSON.stringify(op));},clear(){storage.removeItem(key);}};
}
export function validOperation(op) {
  if(!op||!op.data||!["single","recurring","reschedule","status"].includes(op.kind))return false;
  if(["reschedule","status"].includes(op.kind)&&!uuid(op.lessonId))return false;
  const d=op.data;
  if(op.kind==="status")return ["completed","absent","cancelled"].includes(d.status)&&Object.keys(d).length===1;
  return uuid(d.requestId)&&validInstant(d.startsAt)&&validInstant(d.endsAt)&&d.startsAt<d.endsAt&&typeof d.notes==="string"&&d.notes.length<=1000&&typeof d.allowConflicts==="boolean"&&(op.kind==="recurring"?Number.isSafeInteger(d.count)&&d.count>=2&&d.count<=100:d.count===undefined);
}
export function validateScheduleResult(row,id,op) {
  const bad=()=>{throw new Error("Operação de agenda não confirmada pelo servidor.");};
  if(row?.packageId!==id||!row.summary||typeof row.replayed!=="boolean")bad();
  const d=op.data;
  if(op.kind==="status") {if(row.lesson?.id!==op.lessonId||row.lesson.packageId!==id||row.lesson.status!==d.status)bad();return row;}
  const lessons=op.kind==="recurring"?row.lessons:[row.lesson];
  if(!Array.isArray(lessons)||lessons.length!==(d.count??1)||new Set(lessons.map(l=>l?.id)).size!==lessons.length)bad();
  for(const [i,l] of lessons.entries()) {
    if(!l||!uuid(l.id)||l.packageId!==id||!Object.hasOwn(lessonLabels,l.status)||(!row.replayed&&l.status!=="scheduled")||(i===0&&l.id!==d.requestId)||l.startsAt!==new Date(Date.parse(d.startsAt)+i*604800000).toISOString()||l.endsAt!==new Date(Date.parse(d.endsAt)+i*604800000).toISOString()||l.notes!==d.notes||(op.kind==="reschedule"&&l.rescheduledFromId!==op.lessonId)||(op.kind==="recurring"&&(l.seriesId!==d.requestId||l.seriesIndex!==i||l.seriesCount!==d.count)))bad();
  }
  return row;
}
