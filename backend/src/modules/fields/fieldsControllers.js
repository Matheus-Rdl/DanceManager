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
    try {
      const result = await this.dataAccess.updateField(fieldId, fieldData);
      return ok(result);
    } catch (error) {
      return serverError(error);
    }
  }

  async updateFieldsOrder(fields) {
    try {
      const result = await this.dataAccess.updateFieldsOrder(fields);

      return ok(result);

    } catch (error) {
      console.error("ERRO UPDATE ORDER:");
      console.error(error);

      return serverError(error);
    }
  }
}
