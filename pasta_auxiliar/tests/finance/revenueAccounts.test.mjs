import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

const NOH = "123e4567-e89b-42d3-a456-426614174001";
const INFINITE = "123e4567-e89b-42d3-a456-426614174002";
const FOREIGN = "123e4567-e89b-42d3-a456-426614174003";
const school = "school-test";
const account = (id, overrides = {}) => ({ id, schoolId: school, active: true,
  isDefault: id === NOH, ...overrides });
const accounts = () => [account(NOH), account(INFINITE), account(FOREIGN, { schoolId: "other-school" })];
const isError = code => error => error?.statusCode === code;

/* EN: Exercise the actual revenues DataAccess against an isolated in-memory MongoDB double.
   PT: Executa o DataAccess real de proventos com um banco simulado e isolado. */
const data = source => `data:text/javascript,${encodeURIComponent(source)}`;
const mocks = {
  "../../models/Revenue.js": `
const db = globalThis.__revenue07Fixture;
const matches = (row, query) => Object.entries(query).every(([key, value]) => row[key] === value);
class Document {
  constructor(row) { Object.assign(this, structuredClone(row)); }
  toObject() { return structuredClone({ ...this }); }
}
export default class Revenue {
  static async create(values) {
    const row = { __v: 0, ...structuredClone(values) };
    db.revenues.push(row);
    return new Document(row);
  }
  static async findOne(query) {
    const row = db.revenues.find(item => matches(item, query));
    return row ? new Document(row) : null;
  }
  static async findOneAndUpdate(query, command) {
    const row = db.revenues.find(item => matches(item, query));
    if (!row) return null;
    Object.assign(row, structuredClone(command.$set || {}));
    if (command.$inc) for (const [key, value] of Object.entries(command.$inc)) {
      row[key] = (row[key] || 0) + value;
    }
    if (command.$push?.history) row.history.push(structuredClone(command.$push.history));
    return new Document(row);
  }
  static find(query) {
    const rows = db.revenues.filter(item => Object.entries(query).every(([key, value]) =>
      (typeof value === "object" && value !== null && "$gte" in value)
        ? item[key] >= value.$gte && item[key] <= value.$lte : item[key] === value));
    return { sort: () => ({ lean: async () => structuredClone(rows) }) };
  }
  static async deleteOne(query) {
    const index = db.revenues.findIndex(item => matches(item, query));
    if (index === -1) return { deletedCount: 0 };
    db.revenues.splice(index, 1);
    return { deletedCount: 1 };
  }
}
`,
  "../../models/FinancialAccount.js": `
const db = globalThis.__revenue07Fixture;
export default { findOne: query => ({ lean: async () => structuredClone(
  db.accounts.find(a => Object.entries(query).every(([key, value]) => a[key] === value)) || null
) }) };
`,
  "../monthlyFees/monthlyFeeGeneration.js": `export const todayInBrazil = () => "2026-11-20";`
};
registerHooks({ resolve(specifier, context, nextResolve) {
  const importer = context.parentURL || "";
  if (importer.endsWith("/src/modules/revenues/revenuesDataAccess.js") &&
      Object.hasOwn(mocks, specifier)) {
    return { url: data(mocks[specifier]), shortCircuit: true };
  }
  if ((importer.endsWith("/src/modules/revenues/revenueRules.js") ||
       importer.endsWith("/src/modules/expenses/expenseRules.js")) &&
      specifier === "../monthlyFees/monthlyFeeGeneration.js") {
    return { url: data(mocks[specifier]), shortCircuit: true };
  }
  return nextResolve(specifier, context);
}});

process.env.SCHOOL_ID = school;
globalThis.__revenue07Fixture = { accounts: [], revenues: [] };
const { default: RevenuesDataAccess } = await import("../../src/modules/revenues/revenuesDataAccess.js");
const {
  validateRequestedRevenueAccountId, resolveRevenueAccountId, ensureNoPendingRevenueAccount
} = await import("../../src/modules/revenues/revenueAccountRules.js");
const fixture = (changes = {}) => Object.assign(globalThis.__revenue07Fixture,
  { accounts: accounts(), revenues: [], ...changes });
const dao = () => new RevenuesDataAccess();
const createBody = (changes = {}) => ({ description: "Ingresso vendido", category: "Eventos",
  amount: 100, dueDate: "2026-11-17", initiatorKey: "vanessa", ...changes });
const receivedFields = (changes = {}) => ({ receivedAmount: 100, receivedAt: "2026-11-18",
  method: "pix", ...changes });
const receivedBody = (changes = {}) => createBody({ receivedNow: true, ...receivedFields(), ...changes });
const editBody = (changes = {}) => createBody({ ...receivedFields(),
  reason: "Comprovante revisado e confirmado", ...changes });
const seedRevenue = (changes = {}) => {
  const row = { id: "rev-1", schoolId: school, sourceType: "manual", sourceId: null,
    status: "pending", description: "Ingresso vendido", category: "Eventos", amount: 100,
    reference: "2026-11", dueDate: "2026-11-17", initiator: null,
    receivedAmount: null, receivedAt: null, method: null, accountId: null, notes: "",
    history: [{ action: "created", at: "2026-11-01" }],
    createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z",
    __v: 0, ...changes };
  globalThis.__revenue07Fixture.revenues.push(row);
  return row;
};

beforeEach(() => fixture());

describe("Commit 07: validação da conta de proventos", () => {
  it("aceita accountId omitido, mas rejeita nulo e valores inválidos", () => {
    assert.equal(validateRequestedRevenueAccountId(undefined), undefined);
    for (const value of [null, "", "abc", false, 5, {}, `${NOH} `]) {
      assert.throws(() => validateRequestedRevenueAccountId(value), isError(400));
    }
  });
  it("rejeita accountId em um provento pendente", () => {
    assert.doesNotThrow(() => ensureNoPendingRevenueAccount({}));
    assert.throws(() => ensureNoPendingRevenueAccount({ accountId: NOH }), isError(400));
  });
  it("usa Noh como conta padrão ativa", async () => {
    assert.equal(await resolveRevenueAccountId({ model: fakeAccounts(), schoolId: school }), NOH);
  });
  it("permite selecionar a InfinitePay explicitamente", async () => {
    assert.equal(await resolveRevenueAccountId({ model: fakeAccounts(), schoolId: school,
      requestedAccountId: INFINITE }), INFINITE);
  });
  it("não aceita conta de outra escola ou inexistente", async () => {
    for (const id of [FOREIGN, "123e4567-e89b-42d3-a456-426614174099"]) {
      await assert.rejects(resolveRevenueAccountId({ model: fakeAccounts(), schoolId: school,
        requestedAccountId: id }), isError(404));
    }
  });
  it("bloqueia conta inativa e falta de conta padrão ativa", async () => {
    fixture({ accounts: accounts().map(a => a.id === NOH ? { ...a, active: false } : a) });
    await assert.rejects(resolveRevenueAccountId({ model: fakeAccounts(), schoolId: school,
      requestedAccountId: NOH }), isError(404));
    await assert.rejects(resolveRevenueAccountId({ model: fakeAccounts(), schoolId: school }), isError(409));
  });
  it("mantém compatibilidade temporária sem contas cadastradas", async () => {
    fixture({ accounts: [] });
    assert.equal(await resolveRevenueAccountId({ model: fakeAccounts(), schoolId: school }), null);
  });
  it("o model vincula conta somente ao provento, sem criar payments", () => {
    const schema = readFileSync(new URL("../../src/models/Revenue.js", import.meta.url), "utf8");
    assert.match(schema, /accountId: \{ type: String, default: null, index: true \}/);
    assert.match(schema, /collection: "revenues"/);
  });
});
function fakeAccounts() {
  return { findOne: query => ({ lean: async () => globalThis.__revenue07Fixture.accounts.find(a =>
    Object.entries(query).every(([key, value]) => a[key] === value)) || null }) };
}

describe("Commit 07: integração no DataAccess de proventos", () => {
  it("cadastra provento pendente sem conta e sem recebimento", async () => {
    const result = await dao().create(createBody());
    assert.equal(result.status, "pending");
    assert.equal(result.accountId, null);
    assert.equal(result.receivedAmount, null);
  });
  it("não permite conta ao cadastrar provento pendente", async () => {
    await assert.rejects(dao().create(createBody({ accountId: NOH })), isError(400));
    assert.equal(globalThis.__revenue07Fixture.revenues.length, 0);
  });
  it("usa Noh ao criar um provento já recebido", async () => {
    const result = await dao().create(receivedBody());
    assert.equal(result.status, "received");
    assert.equal(result.accountId, NOH);
    assert.match(result.history.at(-1).details, /conta:/);
  });
  it("registra recebimento no cadastro com InfinitePay", async () => {
    const result = await dao().create(receivedBody({ accountId: INFINITE }));
    assert.equal(result.accountId, INFINITE);
    assert.equal(result.receivedAmount, 100);
  });
  it("não cadastra como recebido com conta estrangeira ou inativa", async () => {
    fixture({ accounts: accounts().map(a => a.id === INFINITE ? { ...a, active: false } : a) });
    for (const accountId of [FOREIGN, INFINITE]) {
      await assert.rejects(dao().create(receivedBody({ accountId })), isError(404));
    }
    assert.equal(globalThis.__revenue07Fixture.revenues.length, 0);
  });
  it("recebe provento pendente na Noh por padrão", async () => {
    seedRevenue();
    const result = await dao().receive("rev-1", receivedFields());
    assert.equal(result.status, "received");
    assert.equal(result.accountId, NOH);
    assert.match(result.history.at(-1).details, /conta:/);
  });
  it("recebe provento pendente na InfinitePay", async () => {
    seedRevenue();
    const result = await dao().receive("rev-1", receivedFields({ accountId: INFINITE }));
    assert.equal(result.accountId, INFINITE);
  });
  it("não recebe sem conta válida selecionada", async () => {
    seedRevenue();
    for (const accountId of [null, FOREIGN]) {
      await assert.rejects(dao().receive("rev-1", receivedFields({ accountId })), isError(accountId===null ? 400 : 404));
    }
    assert.equal(globalThis.__revenue07Fixture.revenues[0].status, "pending");
  });
  it("mantém a conta original na edição sem accountId", async () => {
    seedRevenue({ status: "received", accountId: NOH, receivedAmount: 100,
      receivedAt: "2026-11-18", method: "pix" });
    const result = await dao().update("rev-1", editBody({ receivedAmount: 80 }));
    assert.equal(result.accountId, NOH);
    assert.equal(result.receivedAmount, 80);
    assert.equal(result.history.at(-1).before.accountId, NOH);
    assert.equal(result.history.at(-1).after.accountId, NOH);
  });
  it("altera Noh para InfinitePay somente com ID explícito e histórico", async () => {
    seedRevenue({ status: "received", accountId: NOH, receivedAmount: 100,
      receivedAt: "2026-11-18", method: "pix" });
    const result = await dao().update("rev-1", editBody({ accountId: INFINITE }));
    assert.equal(result.accountId, INFINITE);
    assert.equal(result.history.at(-1).before.accountId, NOH);
    assert.equal(result.history.at(-1).after.accountId, INFINITE);
    assert.equal(result.history.at(-1).reason, "Comprovante revisado e confirmado");
  });
  it("não permite mudar para conta de outra escola na edição", async () => {
    seedRevenue({ status: "received", accountId: NOH, receivedAmount: 100,
      receivedAt: "2026-11-18", method: "pix" });
    await assert.rejects(dao().update("rev-1", editBody({ accountId: FOREIGN })), isError(404));
    assert.equal(globalThis.__revenue07Fixture.revenues[0].accountId, NOH);
  });
  it("mantém proventos antigos sem conta ao editar sem informar accountId", async () => {
    seedRevenue({ status: "received", accountId: null, receivedAmount: 100,
      receivedAt: "2026-11-18", method: "pix" });
    const result = await dao().update("rev-1", editBody());
    assert.equal(result.accountId, null);
    assert.ok(!Object.hasOwn(result.history.at(-1).before, "accountId"));
  });
  it("não associa conta ao editar provento pendente", async () => {
    seedRevenue();
    await assert.rejects(dao().update("rev-1", createBody({ accountId: INFINITE })), isError(400));
    assert.equal(globalThis.__revenue07Fixture.revenues[0].accountId, null);
  });
  it("cancelar recebido preserva a conta e o histórico", async () => {
    seedRevenue({ status: "received", accountId: NOH, receivedAmount: 100,
      receivedAt: "2026-11-18", method: "pix" });
    const result = await dao().cancel("rev-1", { reason: "Recebimento cadastrado indevidamente" });
    assert.equal(result.status, "cancelled");
    assert.equal(result.accountId, NOH);
    assert.equal(result.history.at(-1).before.accountId, NOH);
    assert.equal(result.history.at(-1).after.accountId, NOH);
  });
  it("mantém compatibilidade sem contas cadastradas", async () => {
    fixture({ accounts: [] });
    const result = await dao().create(receivedBody());
    assert.equal(result.status, "received");
    assert.equal(result.accountId, null);
  });
  it("não contabiliza cancelamento como novo recebimento e mantém histórico", async () => {
    seedRevenue({ status: "received", accountId: INFINITE, receivedAmount: 100,
      receivedAt: "2026-11-18", method: "pix" });
    const result = await dao().cancel("rev-1", { reason: "Cancelamento por duplicidade" });
    assert.equal(result.receivedAmount, 100);
    assert.equal(result.accountId, INFINITE);
    assert.equal(result.history.at(-1).action, "cancelled");
  });
});
