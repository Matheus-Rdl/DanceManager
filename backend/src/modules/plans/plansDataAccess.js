import Plan from "../../models/Plan.js";
import Contract from "../../models/Contract.js";

export const DURATIONS = Object.freeze({ Mensal: 1, Semestral: 6, Anual: 12 });
export const PLAN_COLOR_IDS = Object.freeze([
  "purple", "green", "blue", "brown", "teal", "rose",
  "orange", "slate", "cyan", "indigo", "emerald", "red"
]);

const clean = value => String(value ?? "").trim().replace(/\s+/g, " ");
const keyOf = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const validMoney = n => Number.isFinite(n) && n >= 0 && Math.abs(n * 100 - Math.round(n * 100)) < 0.000001;
const roundMoney = n => Math.round(n * 100) / 100;

export function normalizePlan(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw fail("Dados do plano inválidos.");
  const name = clean(body.name);
  if (!name || name.length > 70) throw fail("Informe um nome de plano com até 70 caracteres.");
  if (["mensal", "personalizado", "bolsista", "plano"].includes(keyOf(name))) throw fail("Nome reservado para tipo de contrato do sistema.");
  const description = String(body.description ?? "").trim();
  if (description.length > 500) throw fail("A descrição deve ter até 500 caracteres.");
  if (!PLAN_COLOR_IDS.includes(body.colorId)) throw fail("Selecione uma das 12 cores disponíveis.");
  const modalities = {};
  for (const duration of Object.keys(DURATIONS)) {
    const entry = body.modalities?.[duration] || {};
    const active = entry.active === true;
    const monthlyValue = entry.monthlyValue === "" || entry.monthlyValue == null ? 0 : Number(entry.monthlyValue);
    if (!validMoney(monthlyValue) || (active && monthlyValue <= 0)) {
      throw fail(`Informe um valor mensal válido para ${duration}.`);
    }
    modalities[duration] = { active, monthlyValue: roundMoney(monthlyValue) };
  }
  if (!Object.values(modalities).some(entry => entry.active)) throw fail("Ative ao menos uma duração para o plano.");
  return { name, nameKey: keyOf(name), description, colorId: body.colorId,
    active: body.active !== false, modalities };
}

const legacy = [
  ["Raiz", "purple", [190, 170, 150]],
  ["Balanço", "green", [270, 240, 220]],
  ["Imersão", "blue", [320, 290, 260]],
  ["Beco", "brown", [430, 390, 350]]
];
let initialization;
export async function ensureLegacyPlans() {
  if (initialization) return initialization;
  initialization = (async () => {
    if (await Plan.countDocuments() > 0) return;
    for (const [name, colorId, values] of legacy) {
      const modalities = Object.fromEntries(Object.keys(DURATIONS).map((duration, i) =>
        [duration, { active: true, monthlyValue: values[i] }]));
      await Plan.updateOne({ nameKey: keyOf(name) }, { $setOnInsert: {
        name, nameKey: keyOf(name), description: "Plano existente antes das Configurações",
        colorId, active: true, modalities
      } }, { upsert: true });
    }
  })();
  try { await initialization; } finally { initialization = null; }
}

export async function resolveNewContractPlanPrice(planName, duration) {
  await ensureLegacyPlans();
  if (!Object.hasOwn(DURATIONS, duration)) throw fail("Duração inválida para o plano.");
  const plan = await Plan.findOne({ nameKey: keyOf(planName) }).lean();
  if (!plan || !plan.active || !plan.modalities?.[duration]?.active) {
    throw fail("Plano ou duração indisponível para novos contratos.");
  }
  return { planName: plan.name, monthlyValue: plan.modalities[duration].monthlyValue };
}

export default class PlansDataAccess {
  async listPlans() { await ensureLegacyPlans(); return Plan.find({}).sort({ active: -1, name: 1 }).lean(); }
  async createPlan(body) {
    await ensureLegacyPlans();
    const data = normalizePlan(body);
    if (await Plan.exists({ nameKey: data.nameKey })) throw fail("Já existe um plano com esse nome.", 409);
    try { return await Plan.create(data); }
    catch (e) { if (e.code === 11000) throw fail("Já existe um plano com esse nome.", 409); throw e; }
  }
  async updatePlan(id, body) {
    const existing = await Plan.findById(id).lean();
    if (!existing) throw fail("Plano não encontrado.", 404);
    const data = normalizePlan(body);
    if (existing.nameKey !== data.nameKey) {
      /* Contratos anteriores registram o nome; não permitir renomeá-lo se usado. */
      if (await Contract.exists({ plan: existing.name })) throw fail("Este plano tem contratos. Mantenha seu nome para preservar o histórico.", 409);
    }
    try { return await Plan.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }); }
    catch (e) { if (e.code === 11000) throw fail("Já existe um plano com esse nome.", 409); throw e; }
  }
}
