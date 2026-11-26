import { randomUUID } from "node:crypto";
import { createPackageFields, packageError, participantFilter, packageListFilters, updatePackageFields } from "./privateLessonPackagesRules.js";
import { createPlanFields, validPlanId } from "../privateLessonPlans/privateLessonPlansRules.js";

/* EN: One purchase is persisted for all participants; no finance or lesson documents are created here.
   PT: Persiste uma contratação para todos os participantes; não cria documentos financeiros ou aulas aqui. */
export default class PrivateLessonPackagesDataAccess {
  constructor({ model, planModel, userModel, resolveSchoolId, makeId = randomUUID, clock = () => new Date().toISOString() }) {
    Object.assign(this, { model, planModel, userModel, resolveSchoolId, makeId, clock });
  }

  /* EN: Resolve names in one scoped query and expose only identifiers, names and enrollment numbers.
     PT: Resolve nomes em uma consulta por escola e expõe somente identificadores, nomes e matrículas. */
  async withParticipants(rows, schoolId) {
    const ids = [...new Set(rows.flatMap(row => row.participantIds))];
    const users = ids.length ? await this.userModel.find(participantFilter(schoolId, ids))
      .setOptions({ strictQuery: false }).select("_id user_name user_mat").lean() : [];
    const byId = new Map(users.map(user => [String(user._id).toLowerCase(), user]));
    return rows.map(row => ({ ...row, participants: row.participantIds.map(id => {
      const user = byId.get(id);
      return { id, name: user?.user_name ?? null, registration: user?.user_mat ?? null, available: Boolean(user) };
    }) }));
  }

  /* EN: Offer only scoped participant identifiers, names and enrollment numbers.
     PT: Disponibiliza apenas identificadores, nomes e matrículas da escola. */
  async listParticipants() {
    const schoolId = this.resolveSchoolId();
    const { _id, ...scope } = participantFilter(schoolId, []);
    const users = await this.userModel.find(scope).setOptions({ strictQuery: false })
      .select("_id user_name user_mat").sort({ user_name: 1, _id: 1 }).lean();
    return users.map(user => ({ id: String(user._id).toLowerCase(), name: user.user_name ?? null, registration: user.user_mat ?? null }));
  }

  async list(query = {}) {
    const schoolId = this.resolveSchoolId();
    const rows = await this.model.find({ schoolId, ...packageListFilters(query) })
      .sort({ contractedOn: -1, createdAt: -1, id: 1 }).lean();
    return this.withParticipants(rows, schoolId);
  }

  async get(id) {
    if (!validPlanId(id)) throw packageError("Identificador da contratação inválido.");
    const schoolId = this.resolveSchoolId();
    const row = await this.model.findOne({ schoolId, id }).lean();
    if (!row) throw packageError("Contratação não encontrada.", 404);
    return (await this.withParticipants([row], schoolId))[0];
  }

  /* EN: Compare the client version atomically; never update price, credits, participants or status here.
     PT: Compara a versão do cliente atomicamente; nunca altera preço, créditos, participantes ou situação aqui. */
  async update(id, body) {
    if (!validPlanId(id)) throw packageError("Identificador da contratação inválido.");
    const { version, fields } = updatePackageFields(body);
    const schoolId = this.resolveSchoolId();
    const scope = { schoolId, id };
    const current = await this.model.findOne(scope).lean();
    if (!current) throw packageError("Contratação não encontrada.", 404);
    if (current.status !== "active" && Object.hasOwn(fields, "contractedOn")) throw packageError("A data só pode ser alterada em pacotes ativos.", 409);
    if (current.__v !== version) throw packageError("Pacote alterado por outra operação. Atualize a página.", 409);
    try {
      const updated = await this.model.findOneAndUpdate({ ...scope, __v: version, status: current.status },
        { $set: { ...fields, updatedAt: this.clock() }, $inc: { __v: 1 } },
        { new: true, runValidators: true }).lean();
      if (!updated) throw packageError("Pacote alterado por outra operação. Atualize a página.", 409);
      return (await this.withParticipants([updated], schoolId))[0];
    } catch (error) {
      if (error?.name === "ValidationError") throw packageError("Dados da contratação inválidos.");
      throw error;
    }
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
