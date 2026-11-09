import PaymentsDataAccess from "./paymentsDataAccess.js";
import { ok, created, badRequest, notFound, serverError } from "../../helpers/httpResponse.js";

const fail = error => {
  if (error.statusCode === 404) return notFound(error.message);
  if (error.statusCode === 400) return badRequest(error.message);
  if (error.statusCode === 409) return { success: false, statusCode: 409, body: error.message };
  return serverError(error);
};

export default class PaymentsControllers {
  constructor() { this.dataAccess = new PaymentsDataAccess(); }

  /* Search payment history by student, contract or installment.
     Consulta o histórico por aluno, contrato ou mensalidade. */
  async getPayments(filters = {}) {
    try {
      if (!filters.userId && !filters.contractId && !filters.monthlyFeeId) return badRequest("Informe userId, contractId ou monthlyFeeId.");
      return ok(await this.dataAccess.getPayments(filters));
    } catch (error) { return fail(error); }
  }

  async addPayment(feeId, paymentData) {
    try { return created(await this.dataAccess.addPayment(feeId, paymentData)); }
    catch (error) { return fail(error); }
  }

  /* Edit or reverse an existing payment without deleting its historical record.
     Edita ou estorna um pagamento existente sem apagar seu histórico. */
  async changePayment(paymentId, body, action) {
    try { return ok(await this.dataAccess.changePayment(paymentId, body, action)); }
    catch (error) { return fail(error); }
  }
}
