import RevenuesDataAccess from "./revenuesDataAccess.js";
import { ok } from "../../helpers/httpResponse.js";

export default class RevenuesControllers {
  constructor() { this.dataAccess = new RevenuesDataAccess(); }

  async execute(action) {
    try { return ok(await action()); }
    catch (error) {
      console.error("[Proventos]", error);
      const statusCode = error.statusCode || 500;
      return { success: false, statusCode,
        body: statusCode === 500 ? "Erro interno ao processar proventos." : error.message };
    }
  }

  async list(query) { return this.execute(() => this.dataAccess.list(query)); }
  async create(body) { return this.execute(() => this.dataAccess.create(body)); }
  async update(id, body) { return this.execute(() => this.dataAccess.update(id, body)); }
  async receive(id, body) { return this.execute(() => this.dataAccess.receive(id, body)); }
  async cancel(id, body) { return this.execute(() => this.dataAccess.cancel(id, body)); }
  async remove(id) { return this.execute(() => this.dataAccess.remove(id)); }
}
