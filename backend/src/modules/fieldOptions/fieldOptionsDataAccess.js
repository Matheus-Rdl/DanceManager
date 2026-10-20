import Field from "../../models/Field.js";
import FieldOptions from "../../models/FieldOptions.js";

const fail = (status, message) => ({ status, message });
const normalizeName = value => String(value ?? "").trim().replace(/\s+/g, " ");
const compareName = value => normalizeName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const serialize = options => options.map(o => ({ value: String(o.value), label: String(o.label), order: Number(o.order), active: o.active !== false })).sort((a, b) => a.order - b.order);
const isEditable = field => field?.optionsSource !== "dynamic" && field?.optionsEditable === true && [2, 3].includes(Number(field?.input));

export default class FieldOptionsDataAccess {
  async getCatalog() {
    const records = await FieldOptions.find({}).lean();
    const catalog = {};
    for (const record of records) catalog[record.optionsKey] = serialize(record.options);
    return catalog;
  }
  async getFieldOptions(fieldId) {
    const field = await Field.findById(fieldId).lean();
    if (!field || ![2, 3].includes(Number(field.input))) return fail(404, "Campo de seleção não encontrado.");
    const key = field.optionsKey || field.field;
    const item = field.optionsSource === "dynamic" ? null : await FieldOptions.findOne({ optionsKey: key }).lean();
    return { optionsKey: key, revision: item?.revision ?? 0, options: serialize(item?.options || []), editable: isEditable(field), dynamic: field.optionsSource === "dynamic" || field.field === "activity_teachers" };
  }
  async mutate(fieldId, body) {
    const field = await Field.findById(fieldId).lean();
    if (!field) return fail(404, "Campo não encontrado.");
    if (!isEditable(field) || field.field === "activity_teachers") return fail(403, "As opções deste campo são protegidas.");
    const key = field.optionsKey || field.field;
    // Se uma lista é compartilhada, nenhum campo protegido pode ser contornado por outro campo.
    const peers = await Field.find({ $or: [{ optionsKey: key }, { field: key }] }).lean();
    if (peers.some(peer => [2, 3].includes(Number(peer.input)) && !isEditable(peer)))
      return fail(403, "Esta lista também é utilizada por um campo protegido.");
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some(k => !["action", "value", "label", "values", "revision"].includes(k)))
      return fail(400, "Dados inválidos.");
    const record = await FieldOptions.findOne({ optionsKey: key });
    if (!record) return fail(409, "Catálogo não encontrado. Importe o JSON inicial de fieldOptions antes de editar.");
    if (!Number.isInteger(body.revision) || record.revision !== body.revision)
      return fail(409, "A lista foi modificada em outra sessão. Atualize para continuar.");
    const options = serialize(record.options);
    const command = String(body.action || "");
    const value = String(body.value ?? "");
    if (command === "add") {
      const label = normalizeName(body.label);
      if (!label || label.length > 100) return fail(400, "Informe um nome de até 100 caracteres.");
      if (options.some(o => compareName(o.label) === compareName(label))) return fail(409, "Já existe uma opção com esse nome.");
      // Nunca reutilizar código, inclusive de opções desativadas.
      const codes = options.map(o => Number(o.value)).filter(n => Number.isSafeInteger(n) && n >= 0);
      options.push({ value: String(Math.max(0, ...codes) + 1), label, order: options.length, active: true });
    } else if (command === "rename") {
      const item = options.find(o => o.value === value);
      if (!item) return fail(404, "Opção não encontrada.");
      const label = normalizeName(body.label);
      if (!label || label.length > 100) return fail(400, "Informe um nome de até 100 caracteres.");
      if (options.some(o => o.value !== value && compareName(o.label) === compareName(label))) return fail(409, "Já existe uma opção com esse nome.");
      item.label = label;
    } else if (command === "toggle") {
      const item = options.find(o => o.value === value);
      if (!item) return fail(404, "Opção não encontrada.");
      if (item.active && options.filter(o => o.active).length === 1 && peers.some(peer => peer.required === true))
        return fail(400, "Campo obrigatório precisa manter pelo menos uma opção ativa.");
      item.active = !item.active;
    } else if (command === "reorder") {
      if (!Array.isArray(body.values) || body.values.length !== options.length ||
          new Set(body.values.map(String)).size !== options.length ||
          options.some(o => !body.values.map(String).includes(o.value))) return fail(400, "Ordem inválida.");
      const positions = new Map(body.values.map((val, index) => [String(val), index]));
      options.forEach(o => { o.order = positions.get(o.value); });
    } else return fail(400, "Ação inválida.");
    const result = await FieldOptions.findOneAndUpdate({ _id: record._id, revision: body.revision },
      { $set: { options }, $inc: { revision: 1 } }, { new: true, runValidators: true });
    if (!result) return fail(409, "As opções foram alteradas em outra sessão. Recarregue.");
    return { optionsKey: key, revision: result.revision, options: serialize(result.options), editable: true, dynamic: false };
  }
}
