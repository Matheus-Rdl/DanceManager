import { created } from "../../helpers/httpResponse.js";

/* EN: Keep the API envelope and do not expose internal database errors.
   PT: Mantém o formato da API sem expor erros internos do banco. */
export default class PrivateLessonPackagesControllers {
  constructor(dataAccess) { this.dataAccess = dataAccess; }
  async create(body) {
    try { return created(await this.dataAccess.create(body)); }
    catch (error) {
      const statusCode = [400, 404, 409].includes(error?.statusCode) ? error.statusCode : 500;
      if (statusCode === 500) console.error("[Contratação de aulas particulares]", error);
      return { success: false, statusCode, body: statusCode === 500 ? "Erro interno ao contratar pacote de aulas particulares." : error.message };
    }
  }
}
