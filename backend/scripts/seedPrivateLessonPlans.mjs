import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import mongoose from "mongoose";
import PrivateLessonPlan from "../src/models/PrivateLessonPlan.js";
import { schoolId } from "../src/modules/expenses/expenseRules.js";
import { seedPrivateLessonPlans } from "../src/modules/privateLessonPlans/privateLessonPlansSeed.js";

/* EN: Load the same root .env used by the backend; require explicit permission to write.
   PT: Carrega o mesmo .env da raiz usado pelo backend; exige autorização explícita para gravar. */
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
const args = process.argv.slice(2);
async function main() {
  if (args.length > 1 || args.some(arg => !["--apply", "--dry-run"].includes(arg))) {
    throw new Error("Uso: node scripts/seedPrivateLessonPlans.mjs [--dry-run | --apply]");
  }
  const apply = args.includes("--apply");
  if (!process.env.MONGO_CS || !process.env.MONGO_DB_NAME?.trim()) {
    throw new Error("Configure MONGO_CS e MONGO_DB_NAME antes de executar o script.");
  }
  const school = schoolId();
  console.log(`Banco: ${process.env.MONGO_DB_NAME} | Escola: ${school}`);
  console.log(apply ? "MODO APLICAÇÃO" : "MODO SIMULAÇÃO (NENHUMA GRAVAÇÃO)");
  /* EN: Disable automatic collection/index creation to keep simulation read-only.
     PT: Desativa a criação automática de collections/índices para a simulação ser somente leitura. */
  await mongoose.connect(process.env.MONGO_CS, { dbName: process.env.MONGO_DB_NAME, autoIndex: false, autoCreate: false });
  if (apply) await PrivateLessonPlan.createIndexes();
  const results = await seedPrivateLessonPlans({ model: PrivateLessonPlan, schoolId: school, apply });
  const labels = { created: "CRIADO", preserved: "PRESERVADO", pending: "A CRIAR" };
  for (const { action, name, plan } of results) {
    const amount = plan.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    console.log(`- ${labels[action]}: ${name} | atual: ${plan.name} | ${plan.lessonCount} aula(s) | ${amount} | ${plan.active ? "ativo" : "inativo"}`);
  }
  const count = action => results.filter(result => result.action === action).length;
  console.log(`Criados: ${count("created")} | Preservados: ${count("preserved")} | A criar: ${count("pending")}`);
}
try { await main(); }
catch (error) {
  console.error("[Pacotes iniciais] Falha:", error.message);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
