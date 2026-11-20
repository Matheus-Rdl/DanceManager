import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { migrateLegacyToNoh, legacyNohFilters } from "../../src/modules/financialAccounts/financialAccountsMigration.js";

const NOH = "123e4567-e89b-42d3-a456-426614174001";
const INFINITE = "123e4567-e89b-42d3-a456-426614174002";
const SCHOOL = "default";
const duplicate = value => structuredClone(value);

/* EN: Match only operators used by migration filters; never access a real database.
   PT: Simula apenas os filtros usados na migração, sem acessar um banco real. */
const matches = (doc, filter) => Object.entries(filter).every(([key, wanted]) => {
  const found = doc[key];
  if (wanted === null) return found === null || found === undefined;
  if (wanted && typeof wanted === "object" && !Array.isArray(wanted)) {
    if ("$exists" in wanted && (found !== undefined) !== wanted.$exists) return false;
    if ("$ne" in wanted && found === wanted.$ne) return false;
    return true;
  }
  return found === wanted;
});

function fakeDb(initial = {}) {
  const db = {
    financialAccounts: [{ id: NOH, schoolId: SCHOOL, nameKey: "noh", active: true, isDefault: true,
      initialBalance: 0, balanceDate: "2026-06-30" },
    { id: INFINITE, schoolId: SCHOOL, nameKey: "infinitepay", active: true, isDefault: false,
      initialBalance: 0, balanceDate: "2026-06-30" }],
    payments: [
      { id: "p1", monthlyFeeId: "fee1", amount: 120, status: "confirmed", paidAt: "2026-07-01", method: "pix", auditHistory: [] },
      { id: "p2", monthlyFeeId: "fee1", amount: 50, status: "reversed", paidAt: "2026-07-03", auditHistory: [{ action: "reversed" }] },
      { id: "p3", monthlyFeeId: "fee2", amount: 35, paidAt: "2026-07-04", accountId: null },
      { id: "p4", monthlyFeeId: "fee2", amount: 80, paidAt: "2026-07-05", accountId: INFINITE }
    ],
    expenses: [
      { id: "e1", schoolId: SCHOOL, status: "paid", paidAmount: 80, paidAt: "2026-07-06", accountId: null, history: [{ action: "paid" }] },
      { id: "e2", schoolId: SCHOOL, status: "pending", amount: 45, accountId: null },
      { id: "e3", schoolId: SCHOOL, status: "cancelled", paidAt: "2026-07-08", accountId: null },
      { id: "e4", schoolId: SCHOOL, status: "paid", paidAmount: 20, accountId: INFINITE },
      { id: "e5", schoolId: "other", status: "paid", paidAmount: 22, accountId: null }
    ],
    revenues: [
      { id: "r1", schoolId: SCHOOL, status: "received", receivedAt: "2026-07-07", receivedAmount: 95 },
      { id: "r2", schoolId: SCHOOL, status: "pending", accountId: null },
      { id: "r3", schoolId: SCHOOL, status: "cancelled", accountId: null },
      { id: "r4", schoolId: "other", status: "received", accountId: null }
    ],
    ...duplicate(initial)
  };
  const calls = [];
  const api = {
    collection(name) {
      if (!Object.hasOwn(db, name)) throw new Error("Unknown collection: " + name);
      return {
        async findOne(filter) { return duplicate(db[name].find(item => matches(item, filter)) || null); },
        async countDocuments(filter) { return db[name].filter(row => matches(row, filter)).length; },
        async updateMany(filter, update) {
          if (update.$set === undefined || Object.keys(update).length !== 1) throw new Error("Unsafe update command");
          calls.push({ name, filter: duplicate(filter), update: duplicate(update) });
          let modifiedCount = 0;
          for (const doc of db[name]) {
            if (matches(doc, filter)) { Object.assign(doc, duplicate(update.$set)); modifiedCount++; }
          }
          return { modifiedCount };
        }
      };
    }
  };
  return { api, db, calls };
}

const migrate = (fixture, changes = {}) => migrateLegacyToNoh({ db: fixture.api, schoolId: SCHOOL, ...changes });
const errorContaining = phrase => error => error.message.includes(phrase);

describe("Commit 08: prévia e critérios de migração", () => {
  it("usa accountId ausente/null e filtra despesas pagas e proventos recebidos da escola", () => {
    assert.deepEqual(legacyNohFilters(SCHOOL), {
      payments: { accountId: null },
      expenses: { accountId: null, schoolId: SCHOOL, status: "paid" },
      revenues: { accountId: null, schoolId: SCHOOL, status: "received" }
    });
  });
  it("mostra as contagens antes de gravar qualquer documento", async () => {
    const fixture = fakeDb();
    const snapshot = duplicate(fixture.db);
    const result = await migrate(fixture);
    assert.deepEqual(result.before, { payments: 3, expenses: 1, revenues: 1 });
    assert.equal(result.applied, false);
    assert.equal(result.accountId, NOH);
    assert.deepEqual(fixture.db, snapshot);
    assert.equal(fixture.calls.length, 0);
  });
  it("exige escola, conexão e cadastro da Noh ativa e padrão", async () => {
    await assert.rejects(migrateLegacyToNoh({}), errorContaining("Conexão"));
    await assert.rejects(migrateLegacyToNoh({ db: fakeDb().api, schoolId: "" }), errorContaining("escola"));
    for (const change of [
      [],
      [{ id: NOH, schoolId: SCHOOL, nameKey: "noh", active: false, isDefault: true }],
      [{ id: NOH, schoolId: SCHOOL, nameKey: "noh", active: true, isDefault: false }],
      [{ id: "", schoolId: SCHOOL, nameKey: "noh", active: true, isDefault: true }]
    ]) {
      const fixture = fakeDb({ financialAccounts: change });
      await assert.rejects(migrate(fixture, { apply: true, confirmUnscopedPayments: true }), errorContaining("Noh"));
      assert.equal(fixture.calls.length, 0);
    }
  });
  it("bloqueia outras escolas já cadastradas nas contas financeiras", async () => {
    const fixture = fakeDb();
    fixture.db.financialAccounts.push({ schoolId: "other", nameKey: "another", id: "other-id" });
    await assert.rejects(migrate(fixture), errorContaining("outras escolas"));
    assert.equal(fixture.calls.length, 0);
  });
  it("bloqueia pagamentos com schoolId explícito de outra escola", async () => {
    const fixture = fakeDb();
    fixture.db.payments.push({ id: "p5", schoolId: "other", accountId: null, amount: 123 });
    await assert.rejects(migrate(fixture, { apply: true, confirmUnscopedPayments: true }), errorContaining("outras escolas"));
    assert.equal(fixture.calls.length, 0);
  });
  it("nega aplicação sem a confirmação explícita dos pagamentos antigos sem schoolId", async () => {
    const fixture = fakeDb();
    await assert.rejects(migrate(fixture, { apply: true }), errorContaining("Confirme explicitamente"));
    assert.equal(fixture.calls.length, 0);
  });
});

describe("Commit 08: gravação controlada", () => {
  it("atribui a Noh aos pagamentos antigos, inclusive parciais e estornados", async () => {
    const fixture = fakeDb();
    const result = await migrate(fixture, { apply: true, confirmUnscopedPayments: true });
    assert.deepEqual(result.updated, { payments: 3, expenses: 1, revenues: 1 });
    assert.deepEqual(result.after, { payments: 0, expenses: 0, revenues: 0 });
    assert.deepEqual(fixture.db.payments.map(p => p.accountId), [NOH, NOH, NOH, INFINITE]);
  });
  it("não altera pagamentos anteriores já vinculados a outra conta", async () => {
    const fixture = fakeDb();
    await migrate(fixture, { apply: true, confirmUnscopedPayments: true });
    assert.equal(fixture.db.payments.find(p => p.id === "p4").accountId, INFINITE);
  });
  it("mantém pendências, cancelamentos e lançamentos de outras escolas intactos", async () => {
    const fixture = fakeDb();
    const priorExpenses = duplicate(fixture.db.expenses.slice(1));
    const priorRevenues = duplicate(fixture.db.revenues.slice(1));
    await migrate(fixture, { apply: true, confirmUnscopedPayments: true });
    assert.deepEqual(fixture.db.expenses.slice(1), priorExpenses);
    assert.deepEqual(fixture.db.revenues.slice(1), priorRevenues);
  });
  it("altera apenas accountId, sem tocar dinheiro, datas, status, histórico ou saldos iniciais", async () => {
    const fixture = fakeDb();
    const originals = duplicate(fixture.db);
    await migrate(fixture, { apply: true, confirmUnscopedPayments: true });
    for (const collection of ["payments", "expenses", "revenues"]) {
      fixture.db[collection].forEach((item, index) => {
        const old = originals[collection][index];
        const { accountId: _newAccount, ...other } = item;
        const { accountId: _oldAccount, ...originalOther } = old;
        assert.deepEqual(other, originalOther);
      });
    }
    assert.deepEqual(fixture.db.financialAccounts, originals.financialAccounts);
    for (const { update } of fixture.calls) {
      assert.deepEqual(update, { $set: { accountId: NOH } });
    }
  });
  it("permite executar de novo sem duplicar alterações", async () => {
    const fixture = fakeDb();
    await migrate(fixture, { apply: true, confirmUnscopedPayments: true });
    const prior = duplicate(fixture.db);
    const result = await migrate(fixture, { apply: true, confirmUnscopedPayments: true });
    assert.deepEqual(result.updated, { payments: 0, expenses: 0, revenues: 0 });
    assert.deepEqual(result.after, { payments: 0, expenses: 0, revenues: 0 });
    assert.deepEqual(fixture.db, prior);
  });
  it("continua de forma idempotente após uma falha parcial da gravação", async () => {
    const fixture = fakeDb();
    const nativeCollection = fixture.api.collection.bind(fixture.api);
    let first = true;
    fixture.api.collection = name => {
      const collection = nativeCollection(name);
      if (name !== "expenses" || !first) return collection;
      return { ...collection, updateMany: async () => {
        first = false;
        throw new Error("Falha temporária do MongoDB");
      } };
    };
    await assert.rejects(migrate(fixture, { apply: true, confirmUnscopedPayments: true }), errorContaining("Falha temporária"));
    assert.equal(fixture.db.payments[0].accountId, NOH);
    assert.equal(fixture.db.expenses[0].accountId, null);
    const result = await migrate(fixture, { apply: true, confirmUnscopedPayments: true });
    assert.deepEqual(result.updated, { payments: 0, expenses: 1, revenues: 1 });
  });
  it("informa contagens reais e emite logs somente quando aplica", async () => {
    const fixture = fakeDb();
    const logs = [];
    await migrate(fixture, { writeLog: text => logs.push(text) });
    assert.equal(logs.length, 0);
    await migrate(fixture, { apply: true, confirmUnscopedPayments: true, writeLog: text => logs.push(text) });
    assert.equal(logs.length, 3);
    assert.ok(logs.some(text => text.includes("payments")));
  });
  it("mantém o script em scripts/ e usa o .env da raiz, sem alterar o index", () => {
    const source = readFileSync(new URL("../../scripts/migrateLegacyToNoh.mjs", import.meta.url), "utf8");
    assert.match(source, /\.\.\/\.\.\/\.env/);
    assert.match(source, /--apply/);
    assert.match(source, /--confirm-school/);
    assert.match(source, /--confirm-legacy-payments/);
    assert.match(source, /mongoose\.set\("autoCreate", false\)/);
    assert.match(source, /mongoose\.disconnect\(\)/);
  });
});
