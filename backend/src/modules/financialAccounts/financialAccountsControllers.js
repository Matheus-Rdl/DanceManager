import FinancialAccountsDataAccess from "./financialAccountsDataAccess.js";
import { created, ok } from "../../helpers/httpResponse.js";

/* EN: Controllers keep HTTP responses consistent with the project's existing envelope.
   PT: Controllers mantêm as respostas HTTP no formato já utilizado pelo projeto. */
export default class FinancialAccountsControllers {
  constructor(dataAccess = new FinancialAccountsDataAccess()) { this.dataAccess = dataAccess; }

  async execute(action, isCreation = false) {
    try {
      const result = await action();
      return isCreation ? created(result) : ok(result);
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode >= 500) console.error("[Contas financeiras]", error);
      return { success: false, statusCode,
        body: statusCode >= 500 ? "Erro interno ao processar contas financeiras." : error.message };
    }
  }

  async balances(query) { return this.execute(() => this.dataAccess.balances(query)); }
  async list(query) { return this.execute(() => this.dataAccess.list(query)); }
  async get(id) { return this.execute(() => this.dataAccess.get(id)); }
  async create(body) { return this.execute(() => this.dataAccess.create(body), true); }
  async update(id, body) { return this.execute(() => this.dataAccess.update(id, body)); }
}
