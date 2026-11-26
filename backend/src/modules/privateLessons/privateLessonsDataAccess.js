import { brazilPaymentDate } from "../../models/privateLessonPaymentRules.js";
import { isValidLessonDate } from "../../models/privateLessonRules.js";
import { lessonError, lessonId, scheduleFields, lessonSummary, sameScheduleRequest } from "./privateLessonsRules.js";

/* EN: Package-level version locks serialize scheduling with payments, edits and future lifecycle actions.
   PT: O bloqueio de versão do pacote serializa agendamentos com pagamentos, edições e futuras mudanças de situação. */
export default class PrivateLessonsDataAccess {
  constructor({ packageModel, lessonModel, resolveSchoolId, clock = () => new Date() }) {
    Object.assign(this, { packageModel, lessonModel, resolveSchoolId, clock });
  }
  async list(packageId) {
    const id = lessonId(packageId);
    const schoolId = this.resolveSchoolId();
    const pkg = await this.packageModel.findOne({ schoolId, id }).lean();
    if (!pkg) throw lessonError("Contratação não encontrada.", 404);
    const lessons = await this.lessonModel.find({ schoolId, packageId: id }).sort({ startsAt: 1, id: 1 }).lean();
    return { packageId: id, ...lessonSummary(pkg, lessons), lessons };
  }
  async schedule(packageId, body) {
    const id = lessonId(packageId);
    const fields = scheduleFields(body);
    const schoolId = this.resolveSchoolId();
    const scope = { schoolId, id };
    const lessonScope = { schoolId, packageId: id };
    const timestamp = this.clock().toISOString();
    const session = await this.packageModel.db.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const pkg = await this.packageModel.findOne(scope).session(session).lean();
        if (!pkg) throw lessonError("Contratação não encontrada.", 404);
        const lessons = await this.lessonModel.find(lessonScope).session(session).lean();
        const summary = lessonSummary(pkg, lessons);
        const previous = lessons.find(lesson => lesson.id === fields.id);
        /* EN: Reuse the request UUID as the lesson ID; a retry cannot reserve another credit.
           PT: Reutiliza o UUID da operação como ID da aula; reenvio não reserva outro crédito. */
        if (previous) {
          if (!sameScheduleRequest(previous, fields)) throw lessonError("Identificador de agendamento já utilizado com outros dados.", 409);
          result = { packageId: id, lesson: previous, summary, replayed: true };
          return;
        }
        if (pkg.status !== "active") throw lessonError("Somente pacotes ativos permitem novos agendamentos.", 409);
        if (!isValidLessonDate(pkg.contractedOn) || brazilPaymentDate(new Date(fields.startsAt)) < pkg.contractedOn) throw lessonError("A aula não pode anteceder a data de contratação.");
        if (summary.availableToSchedule < 1) throw lessonError("Não há aulas disponíveis para agendar.", 409);
        if (!Number.isSafeInteger(pkg.__v) || pkg.__v < 0) throw lessonError("Versão da contratação inválida.", 409);
        const locked = await this.packageModel.findOneAndUpdate({ ...scope, __v: pkg.__v, status: "active" },
          { $inc: { __v: 1 }, $set: { updatedAt: timestamp } }, { session, new: true, runValidators: true }).lean();
        if (!locked) throw lessonError("Pacote alterado por outra operação. Atualize e tente novamente com a mesma chave.", 409);
        const lesson = { ...fields, ...lessonScope, status: "scheduled", createdAt: timestamp, updatedAt: timestamp };
        const [created] = await this.lessonModel.create([lesson], { session });
        const saved = created.toObject();
        result = { packageId: id, lesson: saved, summary: lessonSummary(pkg, [...lessons, saved]), replayed: false };
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
      return result;
    } catch (error) {
      if (error?.code === 11000) throw lessonError("Conflito no identificador do agendamento.", 409);
      if (error?.name === "ValidationError") throw lessonError("Dados de agendamento inválidos.");
      throw error;
    } finally { await session.endSession(); }
  }
}
