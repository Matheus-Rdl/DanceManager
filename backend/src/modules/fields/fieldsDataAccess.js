import Field from "../../models/Field.js";
import Menu from "../../models/Menu.js";
import { planFieldPlacement } from "./fieldPlacement.js";
import { validateFieldSettings, allowedFieldSettings } from "./fieldSettingsValidation.js";

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
        optionsKey: 1,
        helpText: 1
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

  /* Movimentação de UM campo entre menus reais da mesma página.
     Somente o selecionado precisa de permissão; os demais mudam de ordem como consequência. */
  async moveField(id, payload) {
    const field = await Field.findById(id).lean();
    if (!field) return { status: 404, message: "Campo não encontrado." };
    const allow = allowedFieldSettings(field);
    if (!allow.includes("order")) return { status: 403, message: "Este campo não permite movimentação." };
    if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
        Object.keys(payload).some(k => !["menuId", "position"].includes(k)) ||
        typeof payload.menuId !== "string" || !payload.menuId.trim() ||
        !Number.isInteger(payload.position)) return { status: 400, message: "Informe o menu e uma posição válida." };

    const menu = await Menu.findOne({ pageId: field.pageId, id: payload.menuId }).lean();
    if (!menu || !Number.isInteger(Number(menu.order)) || Number(menu.order) < 0)
      return { status: 400, message: "Menu inexistente ou inválido para esta página." };
    const folder = Number(menu.order);
    const pageMenus = await Menu.find({ pageId: field.pageId }).lean();
    if (pageMenus.some(item => item.id !== menu.id && Number(item.order) === folder))
      return { status: 409, message: "Dois menus da página possuem o mesmo número de folder. Corrija os menus antes de mover." };

    if (folder !== Number(field.folder) && (!allow.includes("folder") || !allow.includes("menuId")))
      return { status: 403, message: "Este campo só pode mudar de posição no menu atual." };

    const pageFields = await Field.find({ collection: field.collection, pageId: field.pageId }).lean();
    let plan;
    try {
      plan = planFieldPlacement(pageFields, id, field.folder, folder, payload.position, menu.id);
    } catch (e) { return { status: 400, message: e.message }; }
    if (plan.changes.length) {
      // bulkWrite reduz o intervalo entre as alterações. Sem transações, vários documentos
      // não são alterados atomicamente; evite reorganizações simultâneas na mesma página.
      await Field.bulkWrite(plan.changes.map(c => ({ updateOne: {
        filter: { _id: c.fieldId }, update: { $set: c.update }
      } })), { ordered: true });
    }
    return { field: await Field.findById(id).lean(), updatedCount: plan.changes.length };
  }

  /* PATCH controlado: mantém todas as demais propriedades do campo intactas.
     Quando a posição escolhida está ocupada na mesma seção, troca as ordens. */
  async updateFieldSettings(id, payload) {
    const field = await Field.findById(id).lean();
    if (!field) return { status: 404, message: "Campo não encontrado." };
    const validation = validateFieldSettings(field, payload);
    if (validation.status) return validation;
    const { order, ...data } = validation.data;
    const collection = field.collection;
    const pageId = field.pageId;
    const folder = Number(field.folder) || 0;
    if (order !== undefined && order !== Number(field.order)) {
      const target = await Field.findOne({ collection, pageId, folder, order, _id: { $ne: field._id } }).lean();
      if (target && !allowedFieldSettings(target).includes("order")) {
        return { status: 403, message: "Essa posição é ocupada por um campo cuja ordem está protegida." };
      }
      // Comando único de bulkWrite; não requer transação do MongoDB.
      const operations = [{ updateOne: { filter: { _id: field._id }, update: { $set: { ...data, order } } } }];
      if (target) operations.push({ updateOne: { filter: { _id: target._id }, update: { $set: { order: Number(field.order) } } } });
      await Field.bulkWrite(operations, { ordered: true });
      return { field: await Field.findById(field._id).lean() };
    }
    return { field: await Field.findByIdAndUpdate(field._id, { $set: data }, { new: true, runValidators: true }).lean() };
  }
}