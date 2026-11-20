import FinancialTransfersDataAccess from "./financialTransfersDataAccess.js";
import { created, ok } from "../../helpers/httpResponse.js";

/* EN: Match the API's established response envelope and do not leak internal errors.
   PT: Respeita o formato atual da API sem expor erros internos. */
export default class FinancialTransfersControllers {
  constructor(dataAccess = new FinancialTransfersDataAccess()) { this.dataAccess = dataAccess; }

  async create(body) {
    try {
      const result = await this.dataAccess.create(body);
      return result.reused ? ok(result.transfer) : created(result.transfer);
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode >= 500) console.error("[Transferências financeiras]", error);
      return { success: false, statusCode,
        body: statusCode >= 500 ? "Não foi possível registrar a transferência." : error.message };
    }
  }
}
