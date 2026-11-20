import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseSeedAmount, seedInitialFinancialAccounts
} from "../../src/modules/financialAccounts/financialAccountsSeed.js";

const inputs = { schoolId: "default", balanceDate: "2026-11-19",
  nohBalance: 1200.50, infinitePayBalance: 230.25 };

/* EN: Fake only the database calls used by the seed; these tests do not claim MongoDB integration.
   PT: Simula apenas as chamadas ao banco usadas pelo script; estes testes não são integração MongoDB. */
function memoryModel() {
  const records = [];
  let inserts = 0;
  const matching = (record, filter) => Object.entries(filter).every(([key, value]) => record[key] === value);
  const model = {
    records,
    get inserts() { return inserts; },
    find(filter) { return { lean: async () => records.filter(record => matching(record, filter)).map(r => ({ ...r })) }; },
    findOne(filter) { return { lean: async () => {
      const found = records.find(record => matching(record, filter));
      return found ? { ...found } : null;
    } }; },
    async create(doc) {
      inserts += 1;
      if (records.some(r => r.schoolId === doc.schoolId && r.nameKey === doc.nameKey)) {
        throw Object.assign(new Error("E11000"), { code: 11000 });
      }
      if (doc.isDefault && records.some(r => r.schoolId === doc.schoolId && r.isDefault)) {
        throw Object.assign(new Error("E11000"), { code: 11000 });
      }
      records.push({ ...doc });
      return { toObject: () => ({ ...doc }) };
    }
  };
  return model;
}
const run = (model, extra = {}) => seedInitialFinancialAccounts({ model, ...inputs,
  makeId: () => `id-${model.inserts + 1}`, clock: () => "2026-11-19T18:00:00.000Z", ...extra });

describe("Inicialização manual das contas financeiras", () => {
  it("aceita valores manuais com vírgula ou ponto e mantém duas casas", () => {
    assert.equal(parseSeedAmount("1234,56"), 1234.56);
    assert.equal(parseSeedAmount("0"), 0);
    assert.equal(parseSeedAmount("-12.50"), -12.5);
  });

  it("rejeita separador de milhar, valores ausentes, inválidos ou com frações de centavos", () => {
    for (const text of ["", "1.234,56", "1,234.56", "1.000", "1e3", " 10,00 ", "10,000", "abc", "NaN", "Infinity"]) {
      assert.throws(() => parseSeedAmount(text), text);
    }
  });

  it("faz conferência por padrão sem nenhuma inserção", async () => {
    const model = memoryModel();
    const result = await run(model);
    assert.equal(result.applied, false);
    assert.deepEqual(result.plan.map(x => x.action), ["create", "create"]);
    assert.equal(model.records.length, 0);
    assert.equal(model.inserts, 0);
  });

  it("cadastra apenas Noh e InfinitePay quando a gravação é autorizada", async () => {
    const model = memoryModel();
    const result = await run(model, { apply: true });
    assert.equal(result.applied, true);
    assert.deepEqual(result.plan.map(x => x.action), ["created", "created"]);
    assert.equal(model.records.length, 2);
    assert.deepEqual(model.records.map(x => x.name), ["Noh", "InfinitePay"]);
    assert.deepEqual(model.records.map(x => x.type), ["bank", "payment"]);
    assert.deepEqual(model.records.map(x => x.isDefault), [true, false]);
    assert.ok(model.records.every(x => x.schoolId === "default" && x.active && x.balanceDate === "2026-11-19"));
    assert.ok(model.records.every(x => x.createdAt && x.updatedAt && x.id));
    assert.ok(model.records.every(x => !Object.hasOwn(x, "currentBalance")));
  });

  it("é idempotente: executar novamente não modifica nem duplica", async () => {
    const model = memoryModel();
    await run(model, { apply: true });
    const snapshot = structuredClone(model.records);
    const before = model.inserts;
    const again = await run(model, { apply: true });
    assert.deepEqual(again.plan.map(x => x.action), ["existing", "existing"]);
    assert.equal(model.inserts, before);
    assert.deepEqual(model.records, snapshot);
  });

  it("nunca sobrescreve saldo inicial existente, mesmo com --apply", async () => {
    const model = memoryModel();
    await run(model, { apply: true });
    await assert.rejects(run(model, { apply: true, nohBalance: 5000 }), /dados diferentes/);
    assert.equal(model.inserts, 2);
    assert.equal(model.records[0].initialBalance, 1200.50);
  });

  it("bloqueia data diferente, tipo diferente ou conta inativa já cadastrada", async () => {
    const model = memoryModel();
    await run(model, { apply: true });
    await assert.rejects(run(model, { balanceDate: "2026-11-20", apply: true }), /dados diferentes/);
    model.records[1].type = "bank";
    await assert.rejects(run(model, { apply: true }), /dados diferentes/);
    model.records[1].type = "payment";
    model.records[1].active = false;
    await assert.rejects(run(model, { apply: true }), /dados diferentes/);
  });

  it("impede outro padrão da escola e não realiza inserções parciais", async () => {
    const model = memoryModel();
    model.records.push({ schoolId: "default", nameKey: "carteira", name: "Carteira", isDefault: true });
    await assert.rejects(run(model, { apply: true }), /outra conta padrão/);
    assert.equal(model.inserts, 0);
  });

  it("mantém isolamento por escola e não altera dados de outras escolas", async () => {
    const model = memoryModel();
    await run(model, { apply: true, schoolId: "school-a" });
    await run(model, { apply: true, schoolId: "school-b" });
    assert.equal(model.records.length, 4);
    assert.deepEqual(model.records.filter(x => x.schoolId === "school-a").map(x => x.name), ["Noh", "InfinitePay"]);
  });

  it("valida valores e datas antes de acessar o banco", async () => {
    const model = memoryModel();
    await assert.rejects(run(model, { apply: true, nohBalance: "1500" }), /saldo inicial válido/);
    await assert.rejects(run(model, { apply: true, balanceDate: "2026-02-30" }), /Data de referência inválida/);
    await assert.rejects(run(model, { schoolId: "" }), /Identificador da escola inválido/);
    assert.equal(model.inserts, 0);
  });

  it("reconcilia conflito de unicidade se o outro processo gravou dados idênticos", async () => {
    const model = memoryModel();
    const create = model.create.bind(model);
    let simulated = false;
    model.create = async doc => {
      if (!simulated) {
        simulated = true;
        await create(doc);
        throw Object.assign(new Error("E11000"), { code: 11000 });
      }
      return create(doc);
    };
    const result = await run(model, { apply: true });
    assert.deepEqual(result.plan.map(x => x.action), ["existing", "created"]);
    assert.equal(model.records.length, 2);
  });

  it("não aceita uma colisão de unicidade causada por dados diferentes", async () => {
    const model = memoryModel();
    model.create = async doc => {
      model.records.push({ ...doc, initialBalance: 999 });
      throw Object.assign(new Error("E11000"), { code: 11000 });
    };
    await assert.rejects(run(model, { apply: true }), /dados diferentes/);
  });
});
