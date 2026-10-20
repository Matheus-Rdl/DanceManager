import FieldsDataAccess from "./fieldsDataAccess.js";
import { ok, serverError } from "../../helpers/httpResponse.js";

export default class FieldsControllers {
  constructor() {
    this.dataAccess = new FieldsDataAccess();
  }

  async getFields() {
    try {
      const fields = await this.dataAccess.getFields();
      return ok(fields);
    } catch (error) {
      return serverError(error);
    }
  }

  async getFieldsByCollectionAndPage(collection, pageId) {
    try {
      const fields = await this.dataAccess.getFieldsByCollectionAndPage(
        collection,
        pageId
      );

      return ok(fields);
    } catch (error) {
      return serverError(error);
    }
  }

  async addField(fieldData) {
    try {
      const result = await this.dataAccess.addField(fieldData);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async deleteField(fieldId) {
    try {
      const result = await this.dataAccess.deleteField(fieldId);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async updateField(fieldId, fieldData) {
    /* Compatibilidade com PUT antigo, sem deixar contornar os limites do PATCH. */
    return this.updateFieldSettings(fieldId, fieldData);
  }

  async updateFieldsOrder(fields) {
    /* A rota de atualização em massa era irrestrita e contornava editableProperties.
       A ordem agora deve ser modificada pelo PATCH individual do campo autorizado. */
    return { success: false, statusCode: 403,
      body: "Use a edição individual em Configurações para alterar a ordem." };
  }

  async moveField(fieldId, payload) {
    try {
      const result = await this.dataAccess.moveField(fieldId, payload);
      if (result.status) return { success: false, statusCode: result.status, body: result.message };
      return ok(result);
    } catch (error) { return serverError(error); }
  }

  async updateFieldSettings(fieldId, payload) {
    try {
      const result = await this.dataAccess.updateFieldSettings(fieldId, payload);
      if (result.status) return { success: false, statusCode: result.status, body: result.message };
      return ok(result.field);
    } catch (error) { return serverError(error); }
  }
}
