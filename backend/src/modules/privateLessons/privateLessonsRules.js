import { createHash } from "node:crypto";
import { isValidLessonTimestamp, isValidLessonInterval, isValidLessonCount, isValidLessonDate, PRIVATE_LESSON_STATUSES } from "../../models/privateLessonRules.js";
import { validPlanId } from "../privateLessonPlans/privateLessonPlansRules.js";
import { brazilPaymentDate } from "../../models/privateLessonPaymentRules.js";

export const lessonError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export function lessonId(value) {
  if (!validPlanId(value)) throw lessonError("Identificador inválido.");
  return value.toLowerCase();
}
/* EN: Canonical UTC instants avoid ambiguous comparisons; the default duration is one hour.
   PT: Instantes UTC canônicos evitam comparações ambíguas; a duração padrão é de uma hora. */
export function scheduleFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !["requestId", "startsAt", "endsAt", "notes"].includes(key))) throw lessonError("Campos de agendamento inválidos.");
  const id = lessonId(body.requestId);
  const startsAt = body.startsAt;
  if (!isValidLessonTimestamp(startsAt) || !isValidLessonDate(brazilPaymentDate(new Date(startsAt)))) throw lessonError("Data e horário inicial UTC inválidos.");
  const endsAt = body.endsAt === undefined ? new Date(Date.parse(startsAt) + 60 * 60000).toISOString() : body.endsAt;
  if (!isValidLessonInterval(startsAt, endsAt) || !isValidLessonDate(brazilPaymentDate(new Date(endsAt)))) throw lessonError("O horário final deve ser posterior ao inicial e estar em UTC.");
  const notes = body.notes === undefined ? "" : body.notes;
  if (typeof notes !== "string" || notes.trim().length > 1000) throw lessonError("Observações devem ter até 1000 caracteres.");
  return { id, startsAt, endsAt, notes: notes.trim() };
}
/* EN: A completed lesson consumes a credit, a scheduled one reserves it. Other states release it.
   PT: Aula realizada consome crédito, agendada reserva. Outros estados liberam o crédito. */
export function lessonSummary(pkg, lessons) {
  if (!isValidLessonCount(pkg.lessonCount) || !Array.isArray(lessons)) throw lessonError("Histórico de aulas inconsistente.", 409);
  const counts = { scheduled: 0, completed: 0, absent: 0, cancelled: 0 };
  const ids = new Set();
  for (const lesson of lessons) {
    if (!lesson || !validPlanId(lesson.id) || ids.has(lesson.id.toLowerCase()) || !PRIVATE_LESSON_STATUSES.includes(lesson.status)) throw lessonError("Histórico de aulas inconsistente.", 409);
    ids.add(lesson.id.toLowerCase()); counts[lesson.status]++;
  }
  const remaining = pkg.lessonCount - counts.completed;
  const available = remaining - counts.scheduled;
  if (available < 0) throw lessonError("Quantidade de aulas reservadas ou realizadas excede o pacote.", 409);
  return { lessonCount: pkg.lessonCount, scheduledCount: counts.scheduled, completedCount: counts.completed, absentCount: counts.absent, cancelledCount: counts.cancelled, remainingCount: remaining, availableToSchedule: pkg.status === "active" ? available : 0 };
}
export const sameScheduleRequest = (lesson, fields) => ["id", "startsAt", "endsAt", "notes"].every(key => lesson[key] === fields[key]);

/* EN: Weekly batches have deterministic IDs and a bounded size; retries cannot add lessons.
   PT: Lotes semanais têm IDs determinísticos e tamanho limitado; reenvios não adicionam aulas. */
export const MAX_RECURRING_LESSONS = 100;
function seriesLessonId(id, index) {
  if (index === 0) return id;
  const hash = createHash("sha256").update(`private-lesson:${id}:${index}`).digest("hex");
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-8${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
export function scheduleBatchFields(body, recurring = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw lessonError("Campos de agendamento inválidos.");
  const { allowConflicts = false, ...rest } = body;
  if (typeof allowConflicts !== "boolean") throw lessonError("Confirmação de conflitos inválida.");
  if (!recurring) return { allowConflicts, rows: [scheduleFields(rest)] };
  const { count, ...first } = rest;
  if (!Number.isSafeInteger(count) || count < 2 || count > MAX_RECURRING_LESSONS) throw lessonError(`Informe entre 2 e ${MAX_RECURRING_LESSONS} aulas recorrentes.`);
  const base = scheduleFields(first);
  const week = 7 * 24 * 60 * 60 * 1000;
  const rows = Array.from({ length: count }, (_, index) => {
    const startsAt = new Date(Date.parse(base.startsAt) + index * week).toISOString();
    const endsAt = new Date(Date.parse(base.endsAt) + index * week).toISOString();
    const fields = scheduleFields({ requestId: seriesLessonId(base.id, index), startsAt, endsAt, notes: base.notes });
    return { ...fields, seriesId: base.id, seriesIndex: index, seriesCount: count };
  });
  return { allowConflicts, rows };
}
export const sameBatchRequest = (lesson, fields) => sameScheduleRequest(lesson, fields) &&
  ["seriesId", "seriesIndex", "seriesCount"].every(key => lesson[key] === fields[key]);
/* EN: Half-open intervals allow back-to-back appointments, including other packages.
   PT: Intervalos semiabertos permitem aulas consecutivas, inclusive de outros pacotes. */
export function findScheduleConflicts(rows, existing) {
  const conflicts = [];
  for (const [index, row] of rows.entries()) {
    for (const other of [...existing.filter(l => ["scheduled", "completed"].includes(l.status)), ...rows.slice(0, index)]) {
      if (row.startsAt < other.endsAt && other.startsAt < row.endsAt) conflicts.push({
        requestedLessonId: row.id, requestedStartsAt: row.startsAt, requestedEndsAt: row.endsAt,
        lessonId: other.id, packageId: other.packageId ?? null, startsAt: other.startsAt, endsAt: other.endsAt
      });
    }
  }
  return conflicts;
}
