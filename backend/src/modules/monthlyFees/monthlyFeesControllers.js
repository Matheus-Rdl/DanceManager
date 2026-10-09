
import MonthlyFeesDataAccess from "./monthlyFeesDataAccess.js";
import {
  ok,
  created,
  badRequest,
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

  /* Buscar pagamentos */
  async getPaymentsByFee(feeId) {
    try {
      const payments = await this.dataAccess.getPaymentsByFee(feeId);
      return ok(payments);
    } catch (error) {
      return serverError(error);
    }
  }

  /* Registrar pagamento */
  async addPayment(feeId, paymentData) {
    try {
      const result = await this.dataAccess.addPayment(feeId, paymentData);
      return created(result);
    } catch (error) {
      const validationErrors = [
        "Valor do pagamento inválido.",
        "Data do pagamento inválida.",
        "Informe a forma de pagamento.",
        "Não é possível pagar uma mensalidade cancelada.",
        "Essa mensalidade já está quitada.",
        "O pagamento não pode ultrapassar o saldo."
      ];

      if (error.message === "Mensalidade não encontrada.") {
        return notFound(error.message);
      }

      if (validationErrors.includes(error.message)) {
        return badRequest(error.message);
      }

      return serverError(error);
    }
  }
}
