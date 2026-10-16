import DashboardDataAccess from "./dashboardDataAccess.js";
import { ok } from "../../helpers/httpResponse.js";

export default class DashboardControllers {
  constructor() {
    this.dataAccess = new DashboardDataAccess();
  }

  async getSummary() {
    try {
      return ok(await this.dataAccess.getSummary());
    } catch (error) {
      console.error("[Dashboard] Erro ao montar o painel:", error);
      return { success: false, statusCode: 500, body: "Não foi possível carregar o painel principal." };
    }
  }
}
