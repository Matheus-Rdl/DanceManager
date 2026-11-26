import { created, ok } from "../../helpers/httpResponse.js";

/* EN: Preserve the existing API response envelope without exposing database errors.
   PT: Preserva o formato de resposta atual da API sem expor erros do banco. */
export default class PrivateLessonPlansControllers {
  constructor(dataAccess) { this.dataAccess = dataAccess; }

  async execute(action, isCreation = false) {
    try {
      const result = await action();
      return isCreation ? created(result) : ok(result);
    } catch (error) {
      const statusCode = [400, 404, 409].includes(error?.statusCode) ? error.statusCode : 500;
      if (statusCode === 500) console.error("[Modelos de aulas particulares]", error);
      return { success: false, statusCode, body: statusCode === 500 ?
        "Erro interno ao processar modelos de aulas particulares." : error.message };
    }
  }

  list(query) { return this.execute(() => this.dataAccess.list(query)); }
  get(id) { return this.execute(() => this.dataAccess.get(id)); }
  create(body) { return this.execute(() => this.dataAccess.create(body), true); }
  update(id, body) { return this.execute(() => this.dataAccess.update(id, body)); }
}
