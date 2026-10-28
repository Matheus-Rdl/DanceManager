import PlansDataAccess from "./plansDataAccess.js";
import { ok, created } from "../../helpers/httpResponse.js";

export default class PlansControllers {
  constructor() { this.dataAccess = new PlansDataAccess(); }
  async respond(work, create = false) {
    try { const body = await work(); return create ? created(body) : ok(body); }
    catch (error) {
      if (!error.status || error.status >= 500) console.error("[Planos]", error);
      return { success: false, statusCode: error.status || 500,
        body: error.status ? error.message : "Erro interno ao processar planos." };
    }
  }
  listPlans() { return this.respond(() => this.dataAccess.listPlans()); }
  createPlan(body) { return this.respond(() => this.dataAccess.createPlan(body), true); }
  updatePlan(id, body) { return this.respond(() => this.dataAccess.updatePlan(id, body)); }
}
