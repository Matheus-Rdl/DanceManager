import { isValidLessonAmount, isValidLessonCount } from "../../models/privateLessonRules.js";

export const planError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const CREATE_FIELDS = ["name", "lessonCount", "amount"];
const UPDATE_FIELDS = [...CREATE_FIELDS, "active"];

/* EN: Normalize the display name and unique key; never accept a client-supplied key.
   PT: Normaliza o nome de exibição e a chave única; nunca aceita uma chave enviada pelo cliente. */
export const planName = value => {
  if (typeof value !== "string") throw planError("Informe o nome do pacote.");
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 70) throw planError("O nome deve ter de 1 a 70 caracteres.");
  const nameKey = name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  if (!nameKey || nameKey.length > 70) throw planError("Informe um nome válido para o pacote.");
  return { name, nameKey };
};

const checkFields = (body, allowed) => {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !allowed.includes(key))) throw planError("Dados ou campos não permitidos no pacote.");
};
const count = value => {
  if (!isValidLessonCount(value)) throw planError("Quantidade de aulas deve ser um inteiro positivo.");
  return value;
};
const amount = value => {
  if (!isValidLessonAmount(value)) throw planError("Informe um valor positivo com até duas casas decimais.");
  return Math.round(value * 100) / 100;
};

export const createPlanFields = body => {
  checkFields(body, CREATE_FIELDS);
  return { ...planName(body.name), lessonCount: count(body.lessonCount), amount: amount(body.amount) };
};

/* EN: A partial edit only touches allowed fields, never existing purchases or school ownership.
   PT: Uma edição parcial altera apenas campos permitidos, nunca contratações existentes ou a escola. */
export const updatePlanFields = body => {
  checkFields(body, UPDATE_FIELDS);
  if (!Object.keys(body).length) throw planError("Informe ao menos um campo para atualizar.");
  const fields = {};
  if (Object.hasOwn(body, "name")) Object.assign(fields, planName(body.name));
  if (Object.hasOwn(body, "lessonCount")) fields.lessonCount = count(body.lessonCount);
  if (Object.hasOwn(body, "amount")) fields.amount = amount(body.amount);
  if (Object.hasOwn(body, "active")) {
    if (typeof body.active !== "boolean") throw planError("Situação do pacote inválida.");
    fields.active = body.active;
  }
  return fields;
};

export const planListFilters = (query = {}) => {
  checkFields(query, ["active"]);
  if (query.active === undefined) return {};
  if (query.active === "true") return { active: true };
  if (query.active === "false") return { active: false };
  throw planError("Filtro 'active' deve ser true ou false.");
};
export const validPlanId = id => typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
