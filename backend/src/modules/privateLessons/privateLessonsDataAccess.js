import { brazilPaymentDate } from "../../models/privateLessonPaymentRules.js";
import { isValidLessonDate } from "../../models/privateLessonRules.js";
import { lessonError, lessonId, lessonSummary, scheduleBatchFields, sameBatchRequest, findScheduleConflicts, statusFields, validateStatusTransition, rescheduleFields, cancellationFields, cancellationPreview } from "./privateLessonsRules.js";

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
    return { packageId: id, packageStatus: pkg.status, ...lessonSummary(pkg, lessons), lessons };
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
          if (!previous.every((lesson, index) => lesson && !lesson.rescheduledFromId && sameBatchRequest(lesson, rows[index]))) throw lessonError("Identificador de agendamento já utilizado com outros dados.", 409);
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
  changeStatus(packageId, id, body) {
    const status = statusFields(body);
    return this.mutateLesson(packageId, id, { status });
  }
  reschedule(packageId, id, body) { return this.mutateLesson(packageId, id, { body, reschedule: true }); }
  /* EN: Serialize lifecycle changes with bookings and package updates; preserve original records.
     PT: Serializa mudanças de situação com reservas e alterações do pacote; preserva registros originais. */
  async mutateLesson(packageId, rawId, action) {
    const id = lessonId(packageId), targetId = lessonId(rawId), schoolId = this.resolveSchoolId();
    const scope = { schoolId, id }, lessonScope = { schoolId, packageId: id };
    const timestamp = this.clock().toISOString();
    const session = await this.packageModel.db.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        await this.calendarLockModel.updateOne({ _id: schoolId }, { $inc: { version: 1 } }, { session, upsert: true, setDefaultsOnInsert: false });
        const pkg = await this.packageModel.findOne(scope).session(session).lean();
        if (!pkg) throw lessonError("Contratação não encontrada.", 404);
        const lessons = await this.lessonModel.find(lessonScope).session(session).lean();
        const summary = lessonSummary(pkg, lessons);
        const original = lessons.find(row => row.id === targetId);
        if (!original) throw lessonError("Aula não encontrada nesta contratação.", 404);
        const response = (lesson, totals, packageStatus, replayed, previousLesson) => ({ packageId: id, packageStatus, lesson, summary: totals, replayed, ...(previousLesson ? { previousLesson } : {}) });
        let replacement, originalStatus;
        if (action.reschedule) {
          const { fields, allowConflicts } = rescheduleFields(action.body, original);
          const replay = lessons.find(row => row.id === fields.id);
          if (replay) {
            if (replay.rescheduledFromId !== targetId || !sameBatchRequest(replay, fields)) throw lessonError("Identificador de reagendamento já utilizado com outros dados.", 409);
            result = response(replay, summary, pkg.status, true, original);
            return;
          }
          if (pkg.status !== "active" || !["scheduled", "absent"].includes(original.status)) throw lessonError("Somente aulas agendadas ou faltas de pacotes ativos podem ser reagendadas.", 409);
          if (lessons.some(row => row.rescheduledFromId === targetId)) throw lessonError("Esta aula já possui um reagendamento. Consulte a aula substituta.", 409);
          if (original.status === "absent" && summary.availableToSchedule < 1) throw lessonError("Não há aulas disponíveis para reagendar.", 409);
          if (!isValidLessonDate(pkg.contractedOn) || brazilPaymentDate(new Date(fields.startsAt)) < pkg.contractedOn) throw lessonError("A aula não pode anteceder a data de contratação.");
          const existing = await this.lessonModel.find({ schoolId, status: { $in: ["scheduled", "completed"] }, startsAt: { $lt: fields.endsAt }, endsAt: { $gt: fields.startsAt } }).session(session).lean();
          const conflicts = findScheduleConflicts([fields], existing.filter(row => row.id !== targetId));
          if (conflicts.length && !allowConflicts) throw Object.assign(lessonError("Existem conflitos de horários. Confirme para prosseguir.", 409), { code: "LESSON_SCHEDULE_CONFLICT", conflicts });
          replacement = { ...fields, ...lessonScope, status: "scheduled", createdAt: timestamp, updatedAt: timestamp };
          originalStatus = original.status === "scheduled" ? "cancelled" : "absent";
        } else {
          originalStatus = action.status;
          if (original.status === originalStatus) {
            result = response(original, summary, pkg.status, true);
            return;
          }
          if (pkg.status !== "active") throw lessonError("Somente pacotes ativos permitem alterações nas aulas.", 409);
          validateStatusTransition(original, originalStatus, timestamp);
        }
        const changed = original.status !== originalStatus;
        const nextOriginal = changed ? { ...original, status: originalStatus, statusChangedAt: timestamp, updatedAt: timestamp } : original;
        const nextLessons = lessons.map(row => row.id === targetId ? nextOriginal : row);
        if (replacement) nextLessons.push(replacement);
        const totals = lessonSummary(pkg, nextLessons);
        const packageStatus = totals.remainingCount === 0 ? "completed" : "active";
        if (!Number.isSafeInteger(pkg.__v) || pkg.__v < 0) throw lessonError("Versão da contratação inválida.", 409);
        const locked = await this.packageModel.findOneAndUpdate({ ...scope, __v: pkg.__v, status: "active" },
          { $inc: { __v: 1 }, $set: { status: packageStatus, updatedAt: timestamp } }, { session, new: true, runValidators: true }).lean();
        if (!locked) throw lessonError("Pacote alterado por outra operação. Atualize e tente novamente.", 409);
        let savedOriginal = original;
        if (changed) {
          savedOriginal = await this.lessonModel.findOneAndUpdate({ ...lessonScope, id: targetId, status: original.status },
            { $set: { status: originalStatus, statusChangedAt: timestamp, updatedAt: timestamp }, $inc: { __v: 1 } }, { session, new: true, runValidators: true }).lean();
          if (!savedOriginal) throw lessonError("Aula alterada por outra operação. Atualize e tente novamente.", 409);
        }
        if (replacement) {
          const [saved] = await this.lessonModel.create([replacement], { session, ordered: true });
          result = response(saved.toObject(), lessonSummary(locked, nextLessons), packageStatus, false, savedOriginal);
        } else result = response(savedOriginal, lessonSummary(locked, nextLessons), packageStatus, false);
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      return result;
    } catch (error) {
      if (error?.code === 11000) throw lessonError("Conflito no identificador ou na agenda. Tente novamente com a mesma chave.", 409);
      if (error?.name === "ValidationError") throw lessonError("Dados da aula inválidos.");
      throw error;
    } finally { await session.endSession(); }
  }

  async previewCancellation(packageId) {
    const id = lessonId(packageId), schoolId = this.resolveSchoolId();
    const pkg = await this.packageModel.findOne({ schoolId, id }).lean();
    if (!pkg) throw lessonError("Contratação não encontrada.", 404);
    const lessons = await this.lessonModel.find({ schoolId, packageId: id }).lean();
    return cancellationPreview(pkg, lessons);
  }
  /* EN: Cancel only reservations, atomically with the package; never modify receipts or revenues.
     PT: Cancela somente reservas, atomicamente com o pacote; nunca altera recebimentos ou proventos. */
  async cancelPackage(packageId, body) {
    const id = lessonId(packageId), fields = cancellationFields(body), schoolId = this.resolveSchoolId();
    const scope = { schoolId, id }, lessonScope = { schoolId, packageId: id };
    const timestamp = this.clock().toISOString();
    const session = await this.packageModel.db.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        await this.calendarLockModel.updateOne({ _id: schoolId }, { $inc: { version: 1 } }, { session, upsert: true, setDefaultsOnInsert: false });
        const pkg = await this.packageModel.findOne(scope).session(session).lean();
        if (!pkg) throw lessonError("Contratação não encontrada.", 404);
        const lessons = await this.lessonModel.find(lessonScope).session(session).lean();
        const response = (row, history, replayed) => ({ packageId: id, packageStatus: row.status, cancelledAt: row.cancelledAt, reason: row.cancellationReason, requestId: row.cancellationRequestId, summary: lessonSummary(row, history), replayed });
        if (pkg.status === "cancelled" && pkg.cancellationRequestId === fields.requestId) {
          if (pkg.cancellationReason !== fields.reason) throw lessonError("Identificador de cancelamento já utilizado com outros dados.", 409);
          result = response(pkg, lessons, true); return;
        }
        cancellationPreview(pkg, lessons);
        if (pkg.__v !== fields.version) throw lessonError("A contratação mudou. Consulte uma nova prévia antes de cancelar.", 409);
        const locked = await this.packageModel.findOneAndUpdate({ ...scope, __v: fields.version, status: "active" },
          { $inc: { __v: 1 }, $set: { status: "cancelled", cancelledAt: timestamp, cancellationReason: fields.reason, cancellationRequestId: fields.requestId, updatedAt: timestamp } }, { session, new: true, runValidators: true }).lean();
        if (!locked) throw lessonError("Pacote alterado por outra operação. Consulte uma nova prévia.", 409);
        const scheduled = lessons.filter(row => row.status === "scheduled");
        if (scheduled.length) {
          const updated = await this.lessonModel.updateMany({ ...lessonScope, status: "scheduled" }, { $set: { status: "cancelled", statusChangedAt: timestamp, updatedAt: timestamp }, $inc: { __v: 1 } }, { session, runValidators: true });
          if (updated.matchedCount !== scheduled.length || updated.modifiedCount !== scheduled.length) throw lessonError("Agenda alterada por outra operação. Consulte uma nova prévia.", 409);
        }
        result = response(locked, lessons.map(row => row.status === "scheduled" ? { ...row, status: "cancelled" } : row), false);
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      return result;
    } catch (error) {
      if (error?.code === 11000) throw lessonError("Conflito na agenda. Confira o cancelamento antes de repetir.", 409);
      if (error?.name === "ValidationError") throw lessonError("Dados de cancelamento inválidos.");
      throw error;
    } finally { await session.endSession(); }
  }

}
