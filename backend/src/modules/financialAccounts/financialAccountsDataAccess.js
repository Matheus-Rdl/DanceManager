import crypto from "node:crypto";
import FinancialAccount from "../../models/FinancialAccount.js";
import { schoolId } from "../expenses/expenseRules.js";
import {
  accountError, createAccountFields, updateAccountFields, accountListFilters, validAccountId
} from "./financialAccountsRules.js";

const now = () => new Date().toISOString();

/* EN: Map MongoDB uniqueness conflicts to a stable response, regardless of concurrent requests.
   PT: Converte conflitos de índices únicos do MongoDB em uma resposta consistente, inclusive sob concorrência. */
const handleDatabaseError = error => {
  if (error?.code === 11000) throw accountError("Já existe uma conta com esse nome ou uma conta padrão nesta escola.", 409);
  throw error;
};

/* EN: The server controls the school scope; clients cannot select another school's records.
   PT: A escola é definida pelo servidor; clientes não podem consultar ou alterar outra escola. */
export default class FinancialAccountsDataAccess {
  constructor({ model = FinancialAccount, resolveSchoolId = schoolId, makeId = () => crypto.randomUUID(), clock = now } = {}) {
    this.model = model;
    this.resolveSchoolId = resolveSchoolId;
    this.makeId = makeId;
    this.clock = clock;
  }

  async list(filters = {}) {
    const query = { schoolId: this.resolveSchoolId(), ...accountListFilters(filters) };
    return this.model.find(query).sort({ isDefault: -1, name: 1 }).lean();
  }

  async get(id) {
    if (!validAccountId(id)) throw accountError("Identificador da conta inválido.");
    const item = await this.model.findOne({ schoolId: this.resolveSchoolId(), id }).lean();
    if (!item) throw accountError("Conta financeira não encontrada.", 404);
    return item;
  }

  async create(body) {
    const fields = createAccountFields(body);
    const timestamp = this.clock();
    try {
      const item = await this.model.create({ ...fields, id: this.makeId(), schoolId: this.resolveSchoolId(),
        active: true, createdAt: timestamp, updatedAt: timestamp });
      return item.toObject();
    } catch (error) { return handleDatabaseError(error); }
  }

  async update(id, body) {
    if (!validAccountId(id)) throw accountError("Identificador da conta inválido.");
    const changes = updateAccountFields(body);
    const school = this.resolveSchoolId();
    const current = await this.model.findOne({ schoolId: school, id }).lean();
    if (!current) throw accountError("Conta financeira não encontrada.", 404);
    if (current.isDefault && changes.active === false) {
      throw accountError("A conta padrão não pode ser desativada.", 409);
    }
    /* EN: Compare the original updatedAt to reject stale concurrent edits instead of silently losing data.
       PT: Confere o updatedAt original para rejeitar edições simultâneas, evitando perda silenciosa de dados. */
    try {
      const updated = await this.model.findOneAndUpdate(
        { schoolId: school, id, updatedAt: current.updatedAt, __v: current.__v },
        { $set: { ...changes, updatedAt: this.clock() }, $inc: { __v: 1 } },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) throw accountError("Conta alterada por outra operação. Atualize a página.", 409);
      return updated;
    } catch (error) { return handleDatabaseError(error); }
  }
}
