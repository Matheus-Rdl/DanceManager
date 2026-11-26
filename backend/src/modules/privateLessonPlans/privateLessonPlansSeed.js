import { createHash } from "node:crypto";
import { createPlanFields } from "./privateLessonPlansRules.js";

export const DEFAULT_PRIVATE_LESSON_PLANS = Object.freeze([
  Object.freeze({ name: "1 aula", lessonCount: 1, amount: 200 }),
  Object.freeze({ name: "4 aulas", lessonCount: 4, amount: 760 }),
  Object.freeze({ name: "10 aulas", lessonCount: 10, amount: 1800 })
]);

/* EN: Stable UUID per school and original template key, even after a template is renamed.
   PT: UUID estável por escola e chave original do modelo, mesmo após renomear o modelo. */
export function defaultPrivateLessonPlanId(schoolId, nameKey) {
  const hash = createHash("sha256").update(JSON.stringify(["dance-manager:private-lesson-plan:v1", schoolId, nameKey])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x80;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/* EN: Simulation only reads. Apply inserts missing templates and never edits existing data.
   PT: A simulação apenas consulta. A aplicação insere modelos ausentes e nunca edita dados existentes. */
export async function seedPrivateLessonPlans({ model, schoolId, apply = false, clock = () => new Date().toISOString() }) {
  if (typeof schoolId !== "string" || !schoolId.trim()) throw new Error("Escola inválida.");
  if (typeof apply !== "boolean") throw new Error("Modo de execução inválido.");
  const results = [];
  for (const input of DEFAULT_PRIVATE_LESSON_PLANS) {
    const fields = createPlanFields(input);
    const id = defaultPrivateLessonPlanId(schoolId, fields.nameKey);
    const findExisting = async () => {
      const original = await model.findOne({ schoolId, id }).lean();
      return original ?? await model.findOne({ schoolId, nameKey: fields.nameKey }).lean();
    };
    let existing = await findExisting();
    if (existing) {
      results.push({ action: "preserved", name: input.name, plan: existing });
      continue;
    }
    if (!apply) {
      results.push({ action: "pending", name: input.name, plan: { ...fields, id, schoolId, active: true } });
      continue;
    }
    const timestamp = clock();
    try {
      const created = await model.create({ ...fields, id, schoolId, active: true, createdAt: timestamp, updatedAt: timestamp });
      results.push({ action: "created", name: input.name, plan: created.toObject() });
    } catch (error) {
      /* EN: Unique indexes protect concurrent runs; only accept a duplicate if the scoped record exists.
         PT: Índices únicos protegem execuções concorrentes; só aceita duplicidade se o registro da escola existir. */
      if (error?.code !== 11000) throw error;
      existing = await findExisting();
      if (!existing) throw error;
      results.push({ action: "preserved", name: input.name, plan: existing });
    }
  }
  return results;
}
