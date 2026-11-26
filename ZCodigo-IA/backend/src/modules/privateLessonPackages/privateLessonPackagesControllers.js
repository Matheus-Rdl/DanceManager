import { created, ok } from "../../helpers/httpResponse.js";

/* EN: Keep the API envelope and do not expose internal database errors.
   PT: Mantém o formato da API sem expor erros internos do banco. */
export default class PrivateLessonPackagesControllers {
  constructor(dataAccess) { this.dataAccess = dataAccess; }
  async execute(action, isCreation = false) {
    try {
      const result = await action();
      return isCreation ? created(result) : ok(result);
    } catch (error) {
      const statusCode = [400, 404, 409].includes(error?.statusCode) ? error.statusCode : 500;
      if (statusCode === 500) console.error("[Contratação de aulas particulares]", error);
      return { success: false, statusCode, body: statusCode === 500 ? "Erro interno ao processar pacote de aulas particulares." : error.message, ...(statusCode === 409 && error.code === "LESSON_SCHEDULE_CONFLICT" ? { code: error.code, conflicts: error.conflicts } : {}) };
    }
  }
  listParticipants() { return this.execute(() => this.dataAccess.listParticipants()); }
  list(query) { return this.execute(() => this.dataAccess.list(query)); }
  get(id) { return this.execute(() => this.dataAccess.get(id)); }
  create(body) { return this.execute(() => this.dataAccess.create(body), true); }
  update(id, body) { return this.execute(() => this.dataAccess.update(id, body)); }
}
