import FinancialTransfersDataAccess from "./financialTransfersDataAccess.js";
import { created, ok } from "../../helpers/httpResponse.js";

/* EN: Follow the existing API envelope while never exposing internal database errors.
   PT: Respeita o formato atual da API sem expor erros internos do banco. */
export default class FinancialTransfersControllers {
  constructor(dataAccess = new FinancialTransfersDataAccess()) { this.dataAccess = dataAccess; }

  async respond(action, fallbackMessage = "Não foi possível processar a transferência.") {
    try { return await action(); }
    catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode >= 500) console.error("[Transferências financeiras]", error);
      return { success: false, statusCode,
        body: statusCode >= 500 ? fallbackMessage : error.message };
    }
  }

  async create(body) {
    return this.respond(async () => {
      const result = await this.dataAccess.create(body);
      return result.reused ? ok(result.transfer) : created(result.transfer);
    }, "Não foi possível registrar a transferência.");
  }

  async list(filters) { return this.respond(async () => ok(await this.dataAccess.list(filters))); }
  async getById(id) { return this.respond(async () => ok(await this.dataAccess.getById(id))); }
  async reverse(id, body) { return this.respond(async () => ok(await this.dataAccess.reverse(id, body))); }
}
