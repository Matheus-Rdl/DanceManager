import { hasValidParticipants, isValidLessonDate, PRIVATE_PACKAGE_STATUSES } from "../../models/privateLessonRules.js";
import { createPlanFields, validPlanId } from "../privateLessonPlans/privateLessonPlansRules.js";

export const packageError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const COMMON_FIELDS = ["planId", "participantIds", "contractedOn", "notes"];
const CUSTOM_FIELDS = ["name", "lessonCount", "amount"];

/* EN: Accept only purchase inputs; the server owns status, school, identifiers and financial data.
   PT: Aceita apenas dados da contratação; situação, escola, identificadores e dados financeiros pertencem ao servidor. */
export function createPackageFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => ![...COMMON_FIELDS, ...CUSTOM_FIELDS].includes(key))) {
    throw packageError("Dados ou campos não permitidos na contratação.");
  }
  const participantIds = Array.isArray(body.participantIds) ? body.participantIds.map(id =>
    typeof id === "string" ? id.trim().toLowerCase() : id) : body.participantIds;
  if (!hasValidParticipants(participantIds)) throw packageError("Informe participantes válidos, sem duplicações.");
  if (!isValidLessonDate(body.contractedOn)) throw packageError("Data de contratação inválida (AAAA-MM-DD).");
  const notes = body.notes === undefined ? "" : body.notes;
  if (typeof notes !== "string" || notes.trim().length > 1000) throw packageError("Observações devem ter até 1000 caracteres.");
  const planId = body.planId === undefined ? null : body.planId;
  const fields = { participantIds, contractedOn: body.contractedOn, notes: notes.trim(), planId };
  if (planId !== null) {
    if (!validPlanId(planId)) throw packageError("Identificador do modelo inválido.");
    if (CUSTOM_FIELDS.some(key => Object.hasOwn(body, key))) {
      throw packageError("Para alterar valores ou quantidade, contrate um pacote personalizado.");
    }
    return fields;
  }
  const { name, lessonCount, amount } = createPlanFields({ name: body.name, lessonCount: body.lessonCount, amount: body.amount });
  return { ...fields, name, lessonCount, amount };
}

/* EN: The original users collection has no required schoolId. Legacy unscoped users belong to default only.
   PT: A collection original de usuários não exige schoolId. Usuários legados sem escola pertencem apenas à default. */
export function participantFilter(schoolId, participantIds) {
  const filter = { _id: { $in: participantIds } };
  if (schoolId === "default") return { ...filter, $or: [{ schoolId }, { schoolId: { $exists: false } }] };
  return { ...filter, schoolId };
}

/* EN: Whitelist query fields and validate scalar values before constructing Mongo filters.
   PT: Restringe os campos de consulta e valida valores escalares antes de montar filtros Mongo. */
export function packageListFilters(query = {}) {
  const allowed = ["participantId", "status", "from", "to"];
  if (!query || typeof query !== "object" || Array.isArray(query) ||
      Object.keys(query).some(key => !allowed.includes(key))) throw packageError("Filtros de contratação inválidos.");
  const filter = {};
  if (Object.hasOwn(query, "participantId")) {
    const id = typeof query.participantId === "string" ? query.participantId.trim().toLowerCase() : query.participantId;
    if (!hasValidParticipants([id])) throw packageError("Identificador do participante inválido.");
    filter.participantIds = id;
  }
  if (Object.hasOwn(query, "status")) {
    if (!PRIVATE_PACKAGE_STATUSES.includes(query.status)) throw packageError("Situação do pacote inválida.");
    filter.status = query.status;
  }
  for (const key of ["from", "to"]) {
    if (Object.hasOwn(query, key) && !isValidLessonDate(query[key])) throw packageError("Data do filtro inválida (AAAA-MM-DD).");
  }
  if (query.from && query.to && query.from > query.to) throw packageError("O início do período deve anteceder ou coincidir com o fim.");
  if (query.from || query.to) filter.contractedOn = {
    ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {})
  };
  return filter;
}

/* EN: Keep purchase snapshots and participants unchanged. Lifecycle and financial changes require dedicated actions.
   PT: Mantém os dados contratados e participantes intactos. Situação e alterações financeiras exigem ações próprias. */
export function updatePackageFields(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !["notes", "contractedOn", "version"].includes(key))) throw packageError("Campos não permitidos na edição.");
  if (!Number.isSafeInteger(body.version) || body.version < 0) throw packageError("Informe a versão atual do pacote.");
  const fields = {};
  if (Object.hasOwn(body, "notes")) {
    if (typeof body.notes !== "string" || body.notes.trim().length > 1000) throw packageError("Observações devem ter até 1000 caracteres.");
    fields.notes = body.notes.trim();
  }
  if (Object.hasOwn(body, "contractedOn")) {
    if (!isValidLessonDate(body.contractedOn)) throw packageError("Data de contratação inválida (AAAA-MM-DD).");
    fields.contractedOn = body.contractedOn;
  }
  if (!Object.keys(fields).length) throw packageError("Informe ao menos um campo para atualizar.");
  return { version: body.version, fields };
}
