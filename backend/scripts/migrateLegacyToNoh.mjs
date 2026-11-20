import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { config } from "dotenv";
import { Mongo } from "../src/database/mongo.js";
import { migrateLegacyToNoh } from "../src/modules/financialAccounts/financialAccountsMigration.js";

/* EN: Load the same environment file as backend/src/index.js.
   PT: Carrega o mesmo arquivo de ambiente usado por backend/src/index.js. */
const directory = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(directory, "../../.env") });

const help = `Migração de registros antigos para a Noh — execute na pasta backend:
  node scripts/migrateLegacyToNoh.mjs
  node scripts/migrateLegacyToNoh.mjs --apply --confirm-school=default --confirm-legacy-payments

SEM parâmetros: apenas simula, sem modificar nenhum documento.
--apply: solicita a gravação de accountId em pagamentos, despesas pagas e proventos recebidos.
--confirm-school=ID: confirma a escola configurada em SCHOOL_ID (padrão: default).
--confirm-legacy-payments: confirma que TODOS os pagamentos antigos sem schoolId são da escola.

IMPORTANTE: faça backup do MongoDB e execute com o sistema sem novos lançamentos.
Não altera valores, datas, status, histórico ou saldos iniciais; não cria a conta Noh.
`;

/* EN: Fail on unknown/duplicate flags to prevent accidental writes.
   PT: Bloqueia parâmetros desconhecidos/repetidos para evitar escritas acidentais. */
export function parseArgs(args) {
  const options = {};
  for (const argument of args) {
    const match = /^--(apply|confirm-legacy-payments|help|confirm-school)(?:=(.*))?$/.exec(argument);
    if (!match || Object.hasOwn(options, match[1])) throw new Error(`Parâmetro inválido ou duplicado: ${argument}`);
    const key = match[1];
    if (key === "confirm-school") {
      if (!match[2]) throw new Error("Informe --confirm-school=ID.");
      options[key] = match[2];
    } else {
      if (match[2] !== undefined) throw new Error(`Use apenas --${key}, sem valor.`);
      options[key] = true;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(help); return; }
  const schoolId = process.env.SCHOOL_ID || "default";
  if (options["confirm-school"] && options["confirm-school"] !== schoolId) {
    throw new Error(`Escola informada não corresponde ao backend (${schoolId}).`);
  }
  if (options.apply && (options["confirm-school"] !== schoolId || options["confirm-legacy-payments"] !== true)) {
    throw new Error(`Para gravar, informe --apply --confirm-school=${schoolId} --confirm-legacy-payments.`);
  }
  if (!process.env.MONGO_CS || !process.env.MONGO_DB_NAME) {
    throw new Error("Configure MONGO_CS e MONGO_DB_NAME em DanceManager/.env.");
  }

  /* EN: No schema is needed to update accountId, avoiding unintended index/collection creation.
     PT: Não é preciso carregar models para atualizar accountId; evita criar índices/collections. */
  mongoose.set("autoIndex", false);
  mongoose.set("autoCreate", false);
  try {
    await Mongo.connect({ mongoConnectionString: process.env.MONGO_CS,
      mongoDbName: process.env.MONGO_DB_NAME });
    const result = await migrateLegacyToNoh({ db: Mongo.db, schoolId,
      apply: Boolean(options.apply), confirmUnscopedPayments: Boolean(options["confirm-legacy-payments"]),
      writeLog: line => console.log(line) });
    console.log(`\nEscola: ${result.schoolId} | Conta Noh: ${result.accountId}`);
    console.log(result.applied ? "MODO APLICAÇÃO" : "MODO SIMULAÇÃO (NENHUMA GRAVAÇÃO)");
    for (const key of ["payments", "expenses", "revenues"]) {
      console.log(`- ${key}: ${result.before[key]} elegíveis${result.applied ? ` | ${result.updated[key]} atualizados | ${result.after[key]} ainda sem conta` : ""}`);
    }
    if (!result.applied) console.log(`\nApós conferir e fazer backup: --apply --confirm-school=${schoolId} --confirm-legacy-payments`);
    if (result.applied && Object.values(result.after).some(count => count > 0)) {
      throw new Error("Ainda existem registros sem conta após a execução. Confira se houve novas gravações durante a migração.");
    }
  } finally {
    await mongoose.disconnect();
  }
}

/* EN: Print errors with a failing exit code; never silently accept a partial migration.
   PT: Mostra erros com código de saída inválido; nunca ignora migrações parciais. */
main().catch(error => {
  console.error(`[Migração Noh] ${error.message}`);
  process.exitCode = 1;
});
