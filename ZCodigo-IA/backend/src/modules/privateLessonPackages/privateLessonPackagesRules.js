import { hasValidParticipants, isValidLessonDate } from "../../models/privateLessonRules.js";
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
