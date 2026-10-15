import ExpensesDataAccess from "./expensesDataAccess.js";
import { ok } from "../../helpers/httpResponse.js";

/* Controller: aplica o padrão de resposta da API sem consultar o MongoDB diretamente. */
export default class ExpensesControllers {
  constructor() {
    this.dataAccess = new ExpensesDataAccess();
  }

  async execute(action) {
    try {
      return ok(await action());
    } catch (error) {
      console.error("[Despesas]", error);
      const statusCode = error.statusCode || 500;
      return {
        success: false,
        statusCode,
        body: statusCode === 500 ? "Erro interno ao processar despesas." : error.message
      };
    }
  }

  async getExpenses(filters) {
    return this.execute(() => this.dataAccess.list(filters));
  }

  async getRecurrences() {
    return this.execute(() => this.dataAccess.listRecurrences());
  }

  async addExpense(body) {
    return this.execute(() => this.dataAccess.create(body));
  }

  async updateExpense(id, body) {
    return this.execute(() => this.dataAccess.update(id, body));
  }

  async payExpense(id, body) {
    return this.execute(() => this.dataAccess.pay(id, body));
  }

  async cancelExpense(id, body) {
    return this.execute(() => this.dataAccess.cancel(id, body));
  }

  async zeroExpense(id, body) {
    return this.execute(() => this.dataAccess.zero(id, body));
  }

  async deleteExpense(id) {
    return this.execute(() => this.dataAccess.remove(id));
  }

  async addRecurrence(body) {
    return this.execute(() => this.dataAccess.createRecurrence(body));
  }

  async updateRecurrence(id, body) {
    return this.execute(() => this.dataAccess.updateRecurrence(id, body));
  }

  async stopRecurrence(id) {
    return this.execute(() => this.dataAccess.stopRecurrence(id));
  }
}
