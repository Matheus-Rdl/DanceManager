import crypto from "node:crypto";
import { createAccountFields } from "./financialAccountsRules.js";

/* EN: Seed only the two accounts approved for the first release, without hardcoding them into the model.
   PT: Inicializa apenas as duas contas aprovadas nesta etapa, sem fixá-las no model. */
const initialAccounts = ({ balanceDate, nohBalance, infinitePayBalance }) => [
  { ...createAccountFields({ name: "Noh", type: "bank", initialBalance: nohBalance,
    balanceDate, isDefault: true }) },
  { ...createAccountFields({ name: "InfinitePay", type: "payment", initialBalance: infinitePayBalance,
    balanceDate, isDefault: false }) }
];

/* EN: Accept an explicit amount without thousands separators, in Portuguese or dot-decimal notation.
   PT: Aceita valor explícito sem separador de milhar, com vírgula ou ponto como decimal. */
export const parseSeedAmount = text => {
  if (typeof text !== "string" || !/^-?\d+(?:[.,]\d{1,2})?$/.test(text)) {
    throw new Error("Informe um valor em reais sem separador de milhar (ex.: 1234,56).");
  }
  const number = Number(text.replace(",", "."));
  if (!Number.isFinite(number) || !Number.isSafeInteger(Math.round(number * 100))) {
    throw new Error("Saldo inicial fora do intervalo permitido.");
  }
  return number;
};

/* EN: Existing accounts are immutable for this operation: never silently replace financial baselines.
   PT: Contas existentes são imutáveis nesta operação: nunca substituímos saldos de referência silenciosamente. */
const assertMatches = (stored, expected) => {
  const fields = ["nameKey", "type", "initialBalance", "balanceDate", "isDefault", "active"];
  const desired = { ...expected, active: true };
  if (fields.some(field => stored[field] !== desired[field])) {
    throw new Error(`A conta ${expected.name} já existe com dados diferentes. Confira no banco antes de continuar.`);
  }
};

/* EN: A read-only preview is the default; --apply explicitly authorizes creation.
   PT: A conferência sem gravação é o padrão; --apply autoriza explicitamente o cadastro. */
export async function seedInitialFinancialAccounts({
  model, schoolId, balanceDate, nohBalance, infinitePayBalance,
  apply = false, makeId = () => crypto.randomUUID(), clock = () => new Date().toISOString()
}) {
  if (!model || typeof model.find !== "function" || typeof model.create !== "function") {
    throw new Error("Model de contas financeiras inválido.");
  }
  if (typeof schoolId !== "string" || !schoolId.trim()) throw new Error("Identificador da escola inválido.");
  const school = schoolId.trim();
  const proposed = initialAccounts({ balanceDate, nohBalance, infinitePayBalance });
  const current = await model.find({ schoolId: school }).lean();

  /* EN: Abort before any write when another default exists or pre-existing values disagree.
     PT: Interrompe antes de gravar quando há outra conta padrão ou divergências nas contas existentes. */
  if (current.some(item => item.isDefault && item.nameKey !== "noh")) {
    throw new Error("Já existe outra conta padrão nesta escola. Verifique antes de cadastrar a Noh.");
  }
  const plan = proposed.map(expected => {
    const existing = current.find(item => item.nameKey === expected.nameKey);
    if (existing) assertMatches(existing, expected);
    return { name: expected.name, action: existing ? "existing" : "create" };
  });
  if (!apply) return { applied: false, schoolId: school, plan };

  const result = [];
  for (const expected of proposed) {
    const previous = plan.find(item => item.name === expected.name);
    if (previous.action === "existing") {
      result.push({ name: expected.name, action: "existing" });
      continue;
    }
    const timestamp = clock();
    try {
      await model.create({ ...expected, id: makeId(), schoolId: school,
        active: true, createdAt: timestamp, updatedAt: timestamp });
      result.push({ name: expected.name, action: "created" });
    } catch (error) {
      /* EN: A concurrent seed may win the unique index; reconcile rather than duplicating records.
         PT: Outro cadastro simultâneo pode vencer o índice único; conferimos antes de tentar novamente. */
      if (error?.code !== 11000) throw error;
      const stored = await model.findOne({ schoolId: school, nameKey: expected.nameKey }).lean();
      if (!stored) throw error;
      assertMatches(stored, expected);
      result.push({ name: expected.name, action: "existing" });
    }
  }
  return { applied: true, schoolId: school, plan: result };
}
