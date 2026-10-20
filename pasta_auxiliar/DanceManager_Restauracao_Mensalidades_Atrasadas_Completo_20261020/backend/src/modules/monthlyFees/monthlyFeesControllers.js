
import MonthlyFeesDataAccess from "./monthlyFeesDataAccess.js";
import {
  ok,
  notFound,
  serverError
} from "../../helpers/httpResponse.js";

export default class MonthlyFeesControllers {
  constructor() {
    this.dataAccess = new MonthlyFeesDataAccess();
  }

  /* Buscar mensalidades */
  async getMonthlyFees(filters) {
    try {
      const fees = await this.dataAccess.getMonthlyFees(filters);
      return ok(fees);
    } catch (error) {
      return serverError(error);
    }
  }

  /* Todos os atrasos, sem filtro por mês ou ano. */
  async getOverdueMonthlyFees() {
    try {
      const fees = await this.dataAccess.getOverdueMonthlyFees();
      return ok(fees);
    } catch (error) {
      return serverError(error);
    }
  }

  /* Buscar mensalidade específica */
  async getMonthlyFee(feeId) {
    try {
      const fee = await this.dataAccess.getMonthlyFee(feeId);

      if (!fee) {
        return notFound("Mensalidade não encontrada.");
      }

      return ok(fee);
    } catch (error) {
      return serverError(error);
    }
  }
}
