import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

const NOH = "123e4567-e89b-42d3-a456-426614174001";
const INFINITE = "123e4567-e89b-42d3-a456-426614174002";
const FOREIGN = "123e4567-e89b-42d3-a456-426614174003";
const school = "school-test";
const account = (id, options = {}) => ({ id, schoolId: school, isDefault: id === NOH,
  active: true, ...options });
const accounts = () => [account(NOH), account(INFINITE), account(FOREIGN, { schoolId: "another-school" })];
const statusCode = code => error => error.statusCode === code;

/* EN: Mock storage only; exercise the actual expense rules and DataAccess methods.
   PT: Apenas o banco é simulado; executa as regras e métodos reais de despesas. */
const data = source => `data:text/javascript,${encodeURIComponent(source)}`;
const mocks = {
  "../../models/Expense.js": `
const db = globalThis.__expense06Fixture;
const match = (record, query) => Object.entries(query).every(([key, value]) => record[key] === value);
class ExpenseDocument {
  constructor(value) { Object.assign(this, structuredClone(value)); }
  toObject() { return structuredClone({ ...this }); }
}
export default class Expense {
  static async create(values) {
    const record = { __v: 0, ...structuredClone(values) };
    db.expenses.push(record);
    return new ExpenseDocument(record);
  }
  static async findOne(query) {
    const row = db.expenses.find(record => match(record, query));
    return row ? new ExpenseDocument(row) : null;
  }
  static async findOneAndUpdate(query, command) {
    const row = db.expenses.find(record => match(record, query));
    if (!row) return null;
    Object.assign(row, structuredClone(command.$set));
    if (command.$inc) for (const [k, v] of Object.entries(command.$inc)) row[k] = (row[k] || 0) + v;
    if (command.$push?.history) row.history.push(structuredClone(command.$push.history));
    return new ExpenseDocument(row);
  }
  static find(query) {
    const rows = db.expenses.filter(record => match(record, query));
    return { sort: () => ({ lean: async () => structuredClone(rows) }) };
  }
  static async deleteOne() { return { deletedCount: 0 }; }
}
`,
  "../../models/FinancialAccount.js": `
const db = globalThis.__expense06Fixture;
export default { findOne: query => ({ lean: async () => structuredClone(
  db.accounts.find(account => Object.entries(query).every(([k, v]) => account[k] === v)) || null
) }) };
`,
  "../../models/ExpenseRecurrence.js": `export default { findOne: async () => null, find: () => ({ sort: () => ({ lean: async () => [] }) }) };`,
  "./expenseGeneration.js": `export const ensureAllExpenses = async () => 0; export const ensureExpensesForRecurrence = async () => 0;`,
  "../monthlyFees/monthlyFeeGeneration.js": `export const todayInBrazil = () => "2026-11-20";`
};
registerHooks({ resolve(specifier, context, nextResolve) {
  const importer = context.parentURL || "";
  if (importer.endsWith("/src/modules/expenses/expensesDataAccess.js") && Object.hasOwn(mocks, specifier)) {
    return { url: data(mocks[specifier]), shortCircuit: true };
  }
  if (importer.endsWith("/src/modules/expenses/expenseRules.js") &&
    specifier === "../monthlyFees/monthlyFeeGeneration.js") {
    return { url: data(mocks[specifier]), shortCircuit: true };
  }
  return nextResolve(specifier, context);
}});

/* EN: Match the server-owned schoolId used by the real expense DataAccess.
   PT: Usa a mesma escola definida no servidor pelo DataAccess real de despesas. */
process.env.SCHOOL_ID = school;
globalThis.__expense06Fixture = { accounts: [], expenses: [] };
const { default: ExpensesDataAccess } = await import("../../src/modules/expenses/expensesDataAccess.js");
const { validateRequestedExpenseAccountId, resolveExpenseAccountId, ensureNoPendingExpenseAccount } =
  await import("../../src/modules/expenses/expenseAccountRules.js");
const fixture = (overrides = {}) => Object.assign(globalThis.__expense06Fixture,
  { accounts: accounts(), expenses: [], ...overrides });
const createBody = props => ({ description: "Conta de luz", category: "Energia", amount: 100,
  dueDate: "2026-11-15", initiatorKey: "vanessa", ...props });
const paidFields = props => ({ paidAmount: 100, paidAt: "2026-11-18", method: "pix", ...props });
const paidBody = props => createBody({ alreadyPaid: true, ...paidFields(), ...props });
const correctedBody = props => ({ ...createBody(), ...paidFields(), reason: "Pagamento conferido com comprovante", ...props });
const seedExpense = (props = {}) => {
  const item = { id: "expense-1", schoolId: school, status: "pending", amount: 100,
    description: "Conta de luz", category: "Energia", dueDate: "2026-11-15", reference: "2026-11",
    initiator: null, paidAmount: null, paidAt: null, method: null, accountId: null,
    notes: "", history: [{ action: "created", at: "2026-11-01" }],
    updatedAt: "2026-11-01T00:00:00.000Z", createdAt: "2026-11-01T00:00:00.000Z", __v: 0, ...props };
  globalThis.__expense06Fixture.expenses.push(item);
  return item;
};
const dao = () => new ExpensesDataAccess();

beforeEach(() => fixture());

describe("Commit 06: regras de conta nas despesas", () => {
  it("aceita conta omitida, mas rejeita nula, vazia e malformada", () => {
    assert.equal(validateRequestedExpenseAccountId(undefined), undefined);
    for (const id of [null, "", "abc", 42]) {
      assert.throws(() => validateRequestedExpenseAccountId(id), statusCode(400));
    }
  });
  it("não aceita conta bancária antecipada em despesa pendente", () => {
    assert.doesNotThrow(() => ensureNoPendingExpenseAccount({}));
    assert.throws(() => ensureNoPendingExpenseAccount({ accountId: NOH }), statusCode(400));
  });
  it("usa a Noh como padrão quando a conta não é informada", async () => {
    assert.equal(await resolveExpenseAccountId({ model: mockAccountModel(), schoolId: school }), NOH);
  });
  it("aceita InfinitePay como conta explicitamente selecionada", async () => {
    assert.equal(await resolveExpenseAccountId({ model: mockAccountModel(), schoolId: school, requestedAccountId: INFINITE }), INFINITE);
  });
  it("rejeita conta de outra escola ou inexistente", async () => {
    for (const id of [FOREIGN, "123e4567-e89b-42d3-a456-426614174099"]) {
      await assert.rejects(resolveExpenseAccountId({ model: mockAccountModel(), schoolId: school, requestedAccountId: id }), statusCode(404));
    }
  });
  it("rejeita conta inativa e ausência de conta padrão ativa", async () => {
    const available = accounts().map(a => a.id === NOH ? { ...a, active: false } : a);
    fixture({ accounts: available });
    await assert.rejects(resolveExpenseAccountId({ model: mockAccountModel(), schoolId: school, requestedAccountId: NOH }), statusCode(404));
    await assert.rejects(resolveExpenseAccountId({ model: mockAccountModel(), schoolId: school }), statusCode(409));
  });
  it("permite compatibilidade legada quando não existem contas", async () => {
    fixture({ accounts: [] });
    assert.equal(await resolveExpenseAccountId({ model: mockAccountModel(), schoolId: school }), null);
  });
  it("modelo inclui accountId sem alterar estrutura da recorrência", () => {
    const model = readFileSync(new URL("../../src/models/Expense.js", import.meta.url), "utf8");
    assert.match(model, /accountId: \{ type: String, default: null, index: true \}/);
    const recurrence = readFileSync(new URL("../../src/models/ExpenseRecurrence.js", import.meta.url), "utf8");
    assert.doesNotMatch(recurrence, /accountId:/);
  });
});

function mockAccountModel() {
  return { findOne: query => ({ lean: async () => globalThis.__expense06Fixture.accounts.find(row =>
    Object.entries(query).every(([key, value]) => row[key] === value)) || null }) };
}

describe("Commit 06: DataAccess de despesas e histórico", () => {
  it("cria despesa pendente sem conta", async () => {
    const result = await dao().create(createBody());
    assert.equal(result.status, "pending");
    assert.equal(result.accountId, null);
    assert.equal(result.paidAmount, null);
  });
  it("rejeita accountId numa despesa pendente sem gravar lançamento", async () => {
    await assert.rejects(dao().create(createBody({ accountId: NOH })), statusCode(400));
    assert.equal(globalThis.__expense06Fixture.expenses.length, 0);
  });
  it("cria despesa já paga na Noh por padrão", async () => {
    const result = await dao().create(paidBody());
    assert.equal(result.accountId, NOH);
    assert.equal(result.status, "paid");
    assert.equal(result.history[1].action, "paid");
  });
  it("cria despesa já paga na InfinitePay explicitamente", async () => {
    const result = await dao().create(paidBody({ accountId: INFINITE }));
    assert.equal(result.accountId, INFINITE);
  });
  it("impede cadastro já pago com conta inativa, estrangeira ou inexistente", async () => {
    for (const id of [FOREIGN, "123e4567-e89b-42d3-a456-426614174099"]) {
      await assert.rejects(dao().create(paidBody({ accountId: id })), statusCode(404));
      assert.equal(globalThis.__expense06Fixture.expenses.length, 0);
    }
  });
  it("registra pagamento posterior na Noh sem conta enviada", async () => {
    seedExpense();
    const result = await dao().pay("expense-1", paidFields());
    assert.equal(result.status, "paid");
    assert.equal(result.accountId, NOH);
    assert.equal(result.paidAmount, 100);
    assert.match(result.history.at(-1).details, /conta:/);
  });
  it("registra pagamento posterior na InfinitePay", async () => {
    seedExpense();
    const result = await dao().pay("expense-1", paidFields({ accountId: INFINITE }));
    assert.equal(result.accountId, INFINITE);
  });
  it("não paga quando a conta é inválida, inativa ou estrangeira", async () => {
    seedExpense();
    globalThis.__expense06Fixture.accounts.find(a => a.id === INFINITE).active = false;
    for (const id of [null, INFINITE, FOREIGN]) {
      await assert.rejects(dao().pay("expense-1", paidFields({ accountId: id })), statusCode(id === null ? 400 : 404));
      assert.equal(globalThis.__expense06Fixture.expenses[0].status, "pending");
    }
  });
  it("não altera a conta ao corrigir outros campos de uma despesa quitada", async () => {
    seedExpense({ status: "paid", accountId: NOH, paidAmount: 100, paidAt: "2026-11-18", method: "pix" });
    const result = await dao().update("expense-1", correctedBody({ paidAmount: 90 }));
    assert.equal(result.accountId, NOH);
    assert.equal(result.paidAmount, 90);
    assert.equal(result.history.at(-1).before.accountId, NOH);
    assert.equal(result.history.at(-1).after.accountId, NOH);
  });
  it("muda Noh para InfinitePay somente com conta explícita e preserva histórico", async () => {
    seedExpense({ status: "paid", accountId: NOH, paidAmount: 100, paidAt: "2026-11-18", method: "pix" });
    const result = await dao().update("expense-1", correctedBody({ accountId: INFINITE }));
    assert.equal(result.accountId, INFINITE);
    assert.equal(result.history.at(-1).before.accountId, NOH);
    assert.equal(result.history.at(-1).after.accountId, INFINITE);
    assert.equal(result.history.at(-1).reason, "Pagamento conferido com comprovante");
  });
  it("bloqueia edição para conta estrangeira sem alterar lançamento", async () => {
    seedExpense({ status: "paid", accountId: NOH, paidAmount: 100, paidAt: "2026-11-18", method: "pix" });
    await assert.rejects(dao().update("expense-1", correctedBody({ accountId: FOREIGN })), statusCode(404));
    assert.equal(globalThis.__expense06Fixture.expenses[0].accountId, NOH);
  });
  it("mantém despesas legadas sem conta ao corrigir dados sem escolher conta", async () => {
    seedExpense({ status: "paid", accountId: null, paidAmount: 100, paidAt: "2026-11-18", method: "pix" });
    const result = await dao().update("expense-1", correctedBody({ paidAmount: 90 }));
    assert.equal(result.accountId, null);
    assert.ok(!Object.hasOwn(result.history.at(-1).before, "accountId"));
  });
  it("impede colocar conta em despesa pendente durante edição", async () => {
    seedExpense();
    await assert.rejects(dao().update("expense-1", createBody({ accountId: INFINITE })), statusCode(400));
    assert.equal(globalThis.__expense06Fixture.expenses[0].accountId, null);
  });
  it("cancelar despesa quitada conserva a conta e o histórico de antes e depois", async () => {
    seedExpense({ status: "paid", accountId: NOH, paidAmount: 100, paidAt: "2026-11-18", method: "pix" });
    const result = await dao().cancel("expense-1", { reason: "Pagamento cadastrado por engano" });
    assert.equal(result.status, "cancelled");
    assert.equal(result.accountId, NOH);
    assert.equal(result.history.at(-1).before.accountId, NOH);
  });
  it("zerar despesa remove a conta ativa mas mantém a anterior no histórico", async () => {
    seedExpense({ status: "paid", accountId: NOH, paidAmount: 100, paidAt: "2026-11-18", method: "pix" });
    const result = await dao().zero("expense-1", { reason: "Despesa duplicada foi corrigida" });
    assert.equal(result.status, "zeroed");
    assert.equal(result.accountId, null);
    assert.equal(result.history.at(-1).before.accountId, NOH);
    assert.equal(result.history.at(-1).after.accountId, null);
  });
  it("não grava conta quando o cadastro é legado e não existem contas", async () => {
    fixture({ accounts: [] });
    const result = await dao().create(paidBody());
    assert.equal(result.status, "paid");
    assert.equal(result.accountId, null);
  });
});
