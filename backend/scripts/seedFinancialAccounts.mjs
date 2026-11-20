import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { config } from "dotenv";
import { Mongo } from "../src/database/mongo.js";
import FinancialAccount from "../src/models/FinancialAccount.js";
import {
  parseSeedAmount, seedInitialFinancialAccounts
} from "../src/modules/financialAccounts/financialAccountsSeed.js";

/* EN: Match the .env location already used by backend/src/index.js (DanceManager/.env).
   PT: Usa o mesmo local do .env adotado pelo backend/src/index.js (DanceManager/.env). */
const directory = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(directory, "../../.env") });

const usage = `Uso (a partir da pasta backend):
  node scripts/seedFinancialAccounts.mjs --balance-date=AAAA-MM-DD --noh-balance=VALOR --infinitepay-balance=VALOR
  node scripts/seedFinancialAccounts.mjs --balance-date=AAAA-MM-DD --noh-balance=VALOR --infinitepay-balance=VALOR --apply --confirm-school=default

Exemplo de formato (substitua pelos saldos REAIS e pela data correta):
  --balance-date=2026-11-19 --noh-balance=1234,56 --infinitepay-balance=500,00

Sem --apply: apenas confere os registros atuais no MongoDB, sem cadastrar contas.
Com --apply: cadastra somente contas ausentes. Exige confirmação explícita do ID da escola.
Não use separador de milhar. O saldo é a posição ao FINAL do dia informado.
`;

/* EN: Reject unknown or repeated flags to avoid running against the wrong school or amounts.
   PT: Rejeita parâmetros desconhecidos ou repetidos para evitar escola ou valores incorretos. */
const readOptions = args => {
  const options = {};
  const allowed = new Set(["balance-date", "noh-balance", "infinitepay-balance", "confirm-school", "apply", "help"]);
  for (const argument of args) {
    const match = argument.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!match || !allowed.has(match[1]) || Object.hasOwn(options, match[1])) {
      throw new Error(`Parâmetro inválido ou duplicado: ${argument}`);
    }
    if (["apply", "help"].includes(match[1]) && match[2] !== undefined) {
      throw new Error(`Use apenas --${match[1]} (sem valor).`);
    }
    if (!["apply", "help"].includes(match[1]) && !match[2]) {
      throw new Error(`Informe o valor de --${match[1]}.`);
    }
    options[match[1]] = match[2] ?? true;
  }
  return options;
};

async function main() {
  const options = readOptions(process.argv.slice(2));
  if (options.help) { console.log(usage); return; }
  if (!options["balance-date"] || !options["noh-balance"] || !options["infinitepay-balance"]) {
    throw new Error(`Informe data e saldos manuais para ambas as contas.\n${usage}`);
  }
  const school = process.env.SCHOOL_ID || "default";
  if (options.apply && options["confirm-school"] !== school) {
    throw new Error(`Confirme a escola com --confirm-school=${school} antes de gravar.`);
  }
  if (options["confirm-school"] && options["confirm-school"] !== school) {
    throw new Error(`A escola confirmada não corresponde à configuração do backend (${school}).`);
  }
  if (!process.env.MONGO_CS || !process.env.MONGO_DB_NAME) {
    throw new Error("Configure MONGO_CS e MONGO_DB_NAME no .env antes de executar o script.");
  }
  const values = {
    model: FinancialAccount,
    schoolId: school,
    balanceDate: options["balance-date"],
    nohBalance: parseSeedAmount(options["noh-balance"]),
    infinitePayBalance: parseSeedAmount(options["infinitepay-balance"]),
    apply: Boolean(options.apply)
  };

  /* EN: Disable automatic index creation in preview mode to keep it read-only.
     PT: Desativa criação automática de índices no modo conferência para não gravar alterações. */
  if (!options.apply) mongoose.set("autoIndex", false);
  try {
    await Mongo.connect({ mongoConnectionString: process.env.MONGO_CS,
      mongoDbName: process.env.MONGO_DB_NAME });
    if (options.apply) await FinancialAccount.createIndexes();
    const result = await seedInitialFinancialAccounts(values);
    console.log(`Escola: ${result.schoolId} | Modo: ${result.applied ? "CADASTRO" : "CONFERÊNCIA (sem gravação)"}`);
    for (const item of result.plan) {
      const label = { create: "seria cadastrada", created: "cadastrada", existing: "já existente; preservada" }[item.action];
      console.log(`- ${item.name}: ${label}`);
    }
    if (!result.applied) console.log("Nenhum dado foi gravado. Acrescente --apply e --confirm-school para confirmar.");
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(error => {
  console.error(`[Contas Financeiras] ${error.message}`);
  process.exitCode = 1;
});
