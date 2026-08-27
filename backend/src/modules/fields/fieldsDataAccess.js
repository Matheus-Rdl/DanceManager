import Field from "../../models/Field.js";

export default class FieldsDataAccess {

  async getFields() {
    // Busca todos os fields, ordena pela propriedade 'order' e retorna JSON puro
    return await Field.find({}).sort({ order: 1 }).lean();
  }

  async getFieldsByCollectionAndPage(collection, pageId) {
    return await Field.find(
      {
        collection,
        pageId
      },
      {
        title: 1,
        field: 1,
        input: 1,
        order: 1,
        folder: 1,
        type: 1,
        optionsKey: 1
      }
    )
      .sort({
        folder: 1,
        order: 1
      })
      .lean();
  }

  async addField(fieldData) {
    const field = new Field(fieldData);
    return await field.save();
  }

  async deleteField(fieldId) {
    return await Field.findByIdAndDelete(fieldId);
  }

  async updateField(fieldId, fieldData) {
    // Atualiza o documento e retorna o novo, validando que o ID é válido
    return await Field.findByIdAndUpdate(
      fieldId,
      { $set: fieldData },
      { new: true }
    );
  }

  async updateFieldsOrder(fields) {
    const operations = fields.map(field => ({
      updateOne: {
        filter: { _id: field._id },
        update: { $set: { order: field.order } }
      }
    }));

    return await Field.bulkWrite(operations);
  }
}