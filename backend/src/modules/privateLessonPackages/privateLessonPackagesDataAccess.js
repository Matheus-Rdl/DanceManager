import { randomUUID } from "node:crypto";
import { createPackageFields, packageError, participantFilter } from "./privateLessonPackagesRules.js";
import { createPlanFields } from "../privateLessonPlans/privateLessonPlansRules.js";

/* EN: One purchase is persisted for all participants; no finance or lesson documents are created here.
   PT: Persiste uma contratação para todos os participantes; não cria documentos financeiros ou aulas aqui. */
export default class PrivateLessonPackagesDataAccess {
  constructor({ model, planModel, userModel, resolveSchoolId, makeId = randomUUID, clock = () => new Date().toISOString() }) {
    Object.assign(this, { model, planModel, userModel, resolveSchoolId, makeId, clock });
  }

  async create(body) {
    const fields = createPackageFields(body);
    const schoolId = this.resolveSchoolId();
    const users = await this.userModel.find(participantFilter(schoolId, fields.participantIds))
      .setOptions({ strictQuery: false }).select("_id").lean();
    const found = new Set(users.map(user => String(user._id).toLowerCase()));
    if (fields.participantIds.some(id => !found.has(id))) throw packageError("Um ou mais participantes não foram encontrados.", 404);

    /* EN: Snapshot the current active template, never accept a client-provided price for a standard package.
       PT: Copia o modelo ativo atual, nunca aceita preço enviado pelo cliente para pacote padrão. */
    if (fields.planId !== null) {
      const plan = await this.planModel.findOne({ schoolId, id: fields.planId }).lean();
      if (!plan) throw packageError("Modelo de pacote não encontrado.", 404);
      if (plan.active !== true) throw packageError("O modelo de pacote está desativado.", 409);
      const { name, lessonCount, amount } = createPlanFields({ name: plan.name, lessonCount: plan.lessonCount, amount: plan.amount });
      Object.assign(fields, { name, lessonCount, amount });
    }
    const timestamp = this.clock();
    try {
      const item = await this.model.create({ ...fields, id: this.makeId(), schoolId, status: "active", createdAt: timestamp, updatedAt: timestamp });
      return item.toObject();
    } catch (error) {
      if (error?.code === 11000) throw packageError("Conflito no identificador da contratação.", 409);
      if (error?.name === "ValidationError") throw packageError("Dados da contratação inválidos.");
      throw error;
    }
  }
}
