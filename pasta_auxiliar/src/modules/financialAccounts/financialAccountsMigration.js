/* EN: Backfill only the missing financial account reference of historical records.
   PT: Preenche somente a conta financeira ausente dos lançamentos históricos. */

const withoutAccount = { accountId: null }; // MongoDB matches both null and absent accountId.
const COLLECTIONS = Object.freeze([
  { key: "payments", status: null },
  { key: "expenses", status: "paid" },
  { key: "revenues", status: "received" }
]);

/* EN: The requested school owns expenses and revenues. Older payments have no schoolId,
       so they must be migrated only after a single-school safety check.
   PT: A escola identifica despesas e proventos. Pagamentos antigos não possuem schoolId;
       por isso exigem conferência de que o banco é de uma única escola. */
export const legacyNohFilters = schoolId => ({
  payments: { ...withoutAccount },
  expenses: { ...withoutAccount, schoolId, status: "paid" },
  revenues: { ...withoutAccount, schoolId, status: "received" }
});

const nonnegativeCount = number => Number.isSafeInteger(number) && number >= 0;

/* EN: Abort before writes when there is any indication of multi-school financial data.
   PT: Interrompe antes de gravar se houver indício de dados financeiros de outras escolas. */
async function assertSingleSchoolDatabase({ accounts, payments, schoolId }) {
  const foreignAccounts = await accounts.countDocuments({ schoolId: { $ne: schoolId } });
  const foreignPayments = await payments.countDocuments({ schoolId: { $exists: true, $ne: schoolId } });
  if (foreignAccounts > 0 || foreignPayments > 0) {
    throw new Error("Migração bloqueada: o banco contém contas ou pagamentos de outras escolas. É necessário identificar a escola de cada pagamento antes de migrar.");
  }
}

/* EN: A preview does not write. In apply mode, updates are guarded by accountId: null,
       so re-running after a partial failure never overwrites a previously linked account.
   PT: A simulação não grava. Na aplicação, accountId: null protege contas já vinculadas;
       executar novamente após falha parcial não reescreve vínculos existentes. */
export async function migrateLegacyToNoh({
  db, schoolId, apply = false, confirmUnscopedPayments = false,
  writeLog = () => {}
}) {
  if (!db || typeof db.collection !== "function") throw new Error("Conexão com MongoDB inválida.");
  if (typeof schoolId !== "string" || !schoolId.trim()) throw new Error("Identificador da escola inválido.");
  const school = schoolId.trim();
  const accounts = db.collection("financialAccounts");
  const payments = db.collection("payments");

  /* EN: Never create Noh implicitly or guess its ID: retrieve the existing default record.
     PT: Nunca cria a Noh nem adivinha seu ID: consulta o cadastro padrão já existente. */
  const noh = await accounts.findOne({ schoolId: school, nameKey: "noh" });
  if (!noh || typeof noh.id !== "string" || !noh.id || noh.nameKey !== "noh" ||
      noh.schoolId !== school || noh.active !== true || noh.isDefault !== true) {
    throw new Error("Conta Noh padrão e ativa não encontrada nesta escola. Cadastre e confira a Noh antes da migração.");
  }

  await assertSingleSchoolDatabase({ accounts, payments, schoolId: school });
  const filters = legacyNohFilters(school);
  const before = {};
  for (const { key } of COLLECTIONS) {
    before[key] = await db.collection(key).countDocuments(filters[key]);
    if (!nonnegativeCount(before[key])) throw new Error(`Contagem inválida em ${key}.`);
  }
  const preview = { applied: false, schoolId: school, accountId: noh.id, before, updated: null, after: null };
  if (!apply) return preview;

  if (confirmUnscopedPayments !== true) {
    throw new Error("Confirme explicitamente que todos os pagamentos históricos sem schoolId pertencem a esta escola antes de aplicar.");
  }
  const updated = {};
  /* EN: Only $set accountId is allowed here: no change to dates, monetary values,
         statuses, history, initialBalance, or last-modified timestamps.
     PT: Aqui somente $set em accountId: não altera datas, valores, status,
         históricos, saldo inicial ou datas de atualização. */
  for (const { key } of COLLECTIONS) {
    const result = await db.collection(key).updateMany(filters[key], { $set: { accountId: noh.id } });
    if (!nonnegativeCount(result.modifiedCount)) throw new Error(`Atualização sem confirmação em ${key}.`);
    updated[key] = result.modifiedCount;
    writeLog(`${key}: ${result.modifiedCount} registros vinculados à Noh.`);
  }
  const after = {};
  for (const { key } of COLLECTIONS) {
    after[key] = await db.collection(key).countDocuments(filters[key]);
  }
  return { applied: true, schoolId: school, accountId: noh.id, before, updated, after };
}
