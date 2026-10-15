import FinancialDataAccess from "./financialDataAccess.js";
import { ok } from "../../helpers/httpResponse.js";

export default class FinancialControllers {
  constructor() {
    this.dataAccess = new FinancialDataAccess();
  }

  async getSummary(filters = {}) {
    try {
      return ok(await this.dataAccess.getSummary(filters));
    } catch (error) {
      console.error("[Financeiro]", error);
      const statusCode = error.statusCode || 500;
      return {
        success: false, statusCode,
        body: statusCode === 500 ? "Erro interno ao calcular o resumo financeiro." : error.message
      };
    }
  }

  async getTimeline(filters = {}) {
    try {
      return ok(await this.dataAccess.getTimeline(filters));
    } catch (error) {
      console.error("[Financeiro - Evolução]", error);
      const statusCode = error.statusCode || 500;
      return {
        success: false, statusCode,
        body: statusCode === 500 ? "Erro interno ao carregar a evolução financeira." : error.message
      };
    }
  }

  async getReceipts(filters = {}) {
    try {
      return ok(await this.dataAccess.getReceipts(filters));
    } catch (error) {
      console.error("[Financeiro]", error);
      const statusCode = error.statusCode || 500;
      return {
        success: false, statusCode,
        body: statusCode === 500 ? "Erro interno ao consultar recebimentos." : error.message
      };
    }
  }
}
