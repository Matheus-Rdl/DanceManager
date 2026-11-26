import { brazilPaymentDate } from "../../models/privateLessonPaymentRules.js";
import { isValidLessonDate } from "../../models/privateLessonRules.js";
import { lessonError, lessonId, lessonSummary, scheduleBatchFields, sameBatchRequest, findScheduleConflicts } from "./privateLessonsRules.js";

/* EN: Calendar lock serializes school-wide bookings; package lock protects credits and financial/lifecycle edits.
   PT: Bloqueio da agenda serializa reservas da escola; bloqueio do pacote protege créditos e alterações financeiras/de situação. */
export default class PrivateLessonsDataAccess {
  constructor({ packageModel, lessonModel, calendarLockModel, resolveSchoolId, clock = () => new Date() }) {
    Object.assign(this, { packageModel, lessonModel, calendarLockModel, resolveSchoolId, clock });
  }
  async list(packageId) {
    const id = lessonId(packageId);
    const schoolId = this.resolveSchoolId();
    const pkg = await this.packageModel.findOne({ schoolId, id }).lean();
    if (!pkg) throw lessonError("Contratação não encontrada.", 404);
    const lessons = await this.lessonModel.find({ schoolId, packageId: id }).sort({ startsAt: 1, id: 1 }).lean();
    return { packageId: id, ...lessonSummary(pkg, lessons), lessons };
  }
  schedule(packageId, body) { return this.scheduleBatch(packageId, body, false); }
  scheduleRecurring(packageId, body) { return this.scheduleBatch(packageId, body, true); }
  async scheduleBatch(packageId, body, recurring) {
    const id = lessonId(packageId);
    const { rows, allowConflicts } = scheduleBatchFields(body, recurring);
    const schoolId = this.resolveSchoolId();
    const scope = { schoolId, id };
    const lessonScope = { schoolId, packageId: id };
    const timestamp = this.clock().toISOString();
    const session = await this.packageModel.db.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        /* EN: Acquire before reading the calendar; concurrent bookings of different packages must serialize.
           PT: Adquire antes de consultar a agenda; reservas simultâneas de pacotes diferentes devem serializar. */
        await this.calendarLockModel.updateOne({ _id: schoolId }, { $inc: { version: 1 } }, { session, upsert: true, setDefaultsOnInsert: false });
        const pkg = await this.packageModel.findOne(scope).session(session).lean();
        if (!pkg) throw lessonError("Contratação não encontrada.", 404);
        const lessons = await this.lessonModel.find(lessonScope).session(session).lean();
        const summary = lessonSummary(pkg, lessons);
        const previous = rows.map(fields => lessons.find(lesson => lesson.id === fields.id));
        const response = (saved, totals, replayed) => recurring
          ? { packageId: id, lessons: saved, summary: totals, replayed }
          : { packageId: id, lesson: saved[0], summary: totals, replayed };
        if (previous.some(Boolean)) {
          if (!previous.every((lesson, index) => lesson && sameBatchRequest(lesson, rows[index]))) throw lessonError("Identificador de agendamento já utilizado com outros dados.", 409);
          result = response(previous, summary, true);
          return;
        }
        if (pkg.status !== "active") throw lessonError("Somente pacotes ativos permitem novos agendamentos.", 409);
        if (!isValidLessonDate(pkg.contractedOn) || rows.some(row => brazilPaymentDate(new Date(row.startsAt)) < pkg.contractedOn)) throw lessonError("A aula não pode anteceder a data de contratação.");
        if (summary.availableToSchedule < rows.length) throw lessonError("Não há aulas disponíveis suficientes para agendar.", 409);
        const existing = await this.lessonModel.find({ schoolId, status: { $in: ["scheduled", "completed"] },
          startsAt: { $lt: rows.at(-1).endsAt }, endsAt: { $gt: rows[0].startsAt } }).session(session).lean();
        const conflicts = findScheduleConflicts(rows, existing);
        if (conflicts.length && !allowConflicts) throw Object.assign(lessonError("Existem conflitos de horários. Confirme para prosseguir.", 409), { code: "LESSON_SCHEDULE_CONFLICT", conflicts });
        if (!Number.isSafeInteger(pkg.__v) || pkg.__v < 0) throw lessonError("Versão da contratação inválida.", 409);
        const locked = await this.packageModel.findOneAndUpdate({ ...scope, __v: pkg.__v, status: "active" },
          { $inc: { __v: 1 }, $set: { updatedAt: timestamp } }, { session, new: true, runValidators: true }).lean();
        if (!locked) throw lessonError("Pacote alterado por outra operação. Atualize e tente novamente com a mesma chave.", 409);
        const documents = rows.map(fields => ({ ...fields, ...lessonScope, status: "scheduled", createdAt: timestamp, updatedAt: timestamp }));
        const created = await this.lessonModel.create(documents, { session, ordered: true });
        const saved = created.map(lesson => lesson.toObject());
        result = response(saved, lessonSummary(pkg, [...lessons, ...saved]), false);
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      return result;
    } catch (error) {
      if (error?.code === 11000) throw lessonError("Conflito no identificador ou na agenda. Tente novamente com a mesma chave.", 409);
      if (error?.name === "ValidationError") throw lessonError("Dados de agendamento inválidos.");
      throw error;
    } finally { await session.endSession(); }
  }
}
