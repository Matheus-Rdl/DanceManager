import { randomUUID } from "node:crypto";
import { planError, createPlanFields, updatePlanFields, planListFilters, validPlanId } from "./privateLessonPlansRules.js";

const now = () => new Date().toISOString();
const handleDatabaseError = error => {
  if (error?.code === 11000) throw planError("Já existe um modelo de pacote com esse nome nesta escola.", 409);
  if (error?.name === "ValidationError") throw planError("Dados do modelo de pacote inválidos.");
  throw error;
};

/* EN: Inject the persistence model and school resolver to test without a real database.
   PT: Injeta o model e o resolvedor da escola para testar sem um banco real. */
export default class PrivateLessonPlansDataAccess {
  constructor({ model, resolveSchoolId, makeId = randomUUID, clock = now }) {
    this.model = model;
    this.resolveSchoolId = resolveSchoolId;
    this.makeId = makeId;
    this.clock = clock;
  }

  async list(filters = {}) {
    return this.model.find({ schoolId: this.resolveSchoolId(), ...planListFilters(filters) })
      .sort({ active: -1, lessonCount: 1, name: 1, id: 1 }).lean();
  }

  async get(id) {
    if (!validPlanId(id)) throw planError("Identificador do modelo inválido.");
    const item = await this.model.findOne({ schoolId: this.resolveSchoolId(), id }).lean();
    if (!item) throw planError("Modelo de pacote não encontrado.", 404);
    return item;
  }

  async create(body) {
    const fields = createPlanFields(body);
    const timestamp = this.clock();
    try {
      const item = await this.model.create({ ...fields, id: this.makeId(), schoolId: this.resolveSchoolId(),
        active: true, createdAt: timestamp, updatedAt: timestamp });
      return item.toObject();
    } catch (error) { return handleDatabaseError(error); }
  }

  async update(id, body) {
    if (!validPlanId(id)) throw planError("Identificador do modelo inválido.");
    const changes = updatePlanFields(body);
    const scope = { schoolId: this.resolveSchoolId(), id };
    const current = await this.model.findOne(scope).lean();
    if (!current) throw planError("Modelo de pacote não encontrado.", 404);
    /* EN: Reject overlapping writes using the document version; unique indexes protect names.
       PT: Rejeita gravações concorrentes pela versão do documento; índices únicos protegem os nomes. */
    try {
      const updated = await this.model.findOneAndUpdate(
        { ...scope, __v: current.__v },
        { $set: { ...changes, updatedAt: this.clock() }, $inc: { __v: 1 } },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) throw planError("Modelo alterado por outra operação. Atualize a página.", 409);
      return updated;
    } catch (error) { return handleDatabaseError(error); }
  }
}
