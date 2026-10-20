import FieldOptionsDataAccess from "./fieldOptionsDataAccess.js";
import { ok } from "../../helpers/httpResponse.js";

export default class FieldOptionsControllers {
  constructor() {
    this.dataAccess = new FieldOptionsDataAccess();
  }

  /* Mantém o mesmo formato de resposta e os mesmos códigos HTTP das rotas antigas. */
  async execute(action) {
    try {
      const result = await action();
      if (result?.status) {
        return { success: false, statusCode: result.status, body: result.message };
      }
      return ok(result);
    } catch (error) {
      console.error("[fieldOptions]", error);
      return { success: false, statusCode: 500, body: "Erro interno ao consultar opções." };
    }
  }

  async getCatalog() {
    return this.execute(() => this.dataAccess.getCatalog());
  }

  async getFieldOptions(fieldId) {
    return this.execute(() => this.dataAccess.getFieldOptions(fieldId));
  }

  async mutateOptions(fieldId, body) {
    return this.execute(() => this.dataAccess.mutate(fieldId, body));
  }
}
