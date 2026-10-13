import PaymentsDataAccess from "./paymentsDataAccess.js";
import { ok, created, badRequest, notFound, serverError } from "../../helpers/httpResponse.js";

export default class PaymentsControllers {
  constructor() { this.dataAccess = new PaymentsDataAccess(); }

  /* Busca pagamentos por aluno, contrato ou mensalidade. */
  async getPayments(filters = {}) {
    try {
      if (!filters.userId && !filters.contractId && !filters.monthlyFeeId) {
        return badRequest("Informe userId, contractId ou monthlyFeeId.");
      }
      return ok(await this.dataAccess.getPayments(filters));
    } catch (error) { return serverError(error); }
  }

  /* Registra pagamento de uma mensalidade. */
  async addPayment(feeId, paymentData) {
    try {
      return created(await this.dataAccess.addPayment(feeId, paymentData));
    } catch (error) {
      if (error.message === "Mensalidade não encontrada.") return notFound(error.message);
      const validationErrors = [
        "Valor do pagamento inválido.", "Data do pagamento inválida.",
        "Informe a forma de pagamento.", "Não é possível pagar uma mensalidade cancelada.",
        "Essa mensalidade já está quitada.", "O pagamento não pode ultrapassar o saldo."
      ];
      if (validationErrors.includes(error.message)) return badRequest(error.message);
      return serverError(error);
    }
  }
}
