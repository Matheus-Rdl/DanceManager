import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

/* EN: The uploaded backend ZIP excludes third-party packages. Intercept imports for isolated tests.
   PT: O ZIP do backend não contém bibliotecas externas. Interceptamos imports para testes isolados. */
const mongooseStub = `
class Schema { constructor(obj, options) { this.obj = obj; this.options = options; } index() {} }
export default { Schema, model: (name, schema) => ({ modelName: name, schema }) };
`;
const schoolStub = `export const schoolId = () => "school-from-server";`;
const expressStub = `export default { Router: () => {
  const routes = [];
  return { routes, get: (path, handler) => routes.push({ method: "GET", path, handler }),
    post: (path, handler) => routes.push({ method: "POST", path, handler }),
    patch: (path, handler) => routes.push({ method: "PATCH", path, handler }) };
}};`;
const data = code => `data:text/javascript,${encodeURIComponent(code)}`;
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "mongoose") return { url: data(mongooseStub), shortCircuit: true };
  if (specifier === "../expenses/expenseRules.js") return { url: data(schoolStub), shortCircuit: true };
  if (specifier === "express") return { url: data(expressStub), shortCircuit: true };
  return nextResolve(specifier, context);
}});

const { accountName, createAccountFields, updateAccountFields, accountListFilters } =
  await import("../../src/modules/financialAccounts/financialAccountsRules.js");
const { default: DataAccess } = await import("../../src/modules/financialAccounts/financialAccountsDataAccess.js");
const { default: Controllers } = await import("../../src/modules/financialAccounts/financialAccountsControllers.js");
const { default: router } = await import("../../src/modules/financialAccounts/financialAccountsRouter.js");

const ID = "123e4567-e89b-42d3-a456-426614174000";
const newAccount = () => ({ name: "Noh", type: "bank", initialBalance: 2500.25, balanceDate: "2026-11-19" });

/* EN: A small in-memory model checks scoped queries and updates; it is NOT a MongoDB substitute.
   PT: Um pequeno model em memória confere filtros e atualizações; NÃO substitui o MongoDB. */
function fakeModel() {
  const records = [];
  const scoped = (row, query) => Object.entries(query).every(([key, value]) => row[key] === value);
  return {
    records,
    find(query) {
      const found = records.filter(row => scoped(row, query));
      return { sort: () => ({ lean: async () => found.map(row => ({ ...row })) }) };
    },
    findOne(query) {
      const item = records.find(row => scoped(row, query));
      return { lean: async () => item ? { ...item } : null };
    },
    async create(payload) {
      if (records.some(row => row.schoolId === payload.schoolId && row.nameKey === payload.nameKey)) {
        throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
      }
      const row = { ...payload, __v: 0 };
      records.push(row);
      return { toObject: () => ({ ...row }) };
    },
    findOneAndUpdate(query, changes, options) {
      const item = records.find(row => scoped(row, query));
      if (!item) return { lean: async () => null };
      Object.assign(item, changes.$set);
      item.__v += changes.$inc.__v;
      return { lean: async () => ({ ...item }) };
    }
  };
}

const make = (model = fakeModel(), school = "school-from-server") => new DataAccess({ model,
  resolveSchoolId: () => school, makeId: () => ID, clock: () => "2026-11-19T18:00:00.000Z" });
const expectCode = (action, statusCode) => assert.rejects(action, error => error.statusCode === statusCode);

describe("Contas financeiras: validação", () => {
  it("normaliza nomes e acentos para prevenir duplicidade", () => {
    assert.deepEqual(accountName("  Cárteira   Escola  "), { name: "Cárteira Escola", nameKey: "carteira-escola" });
  });
  it("aceita Noh e InfinitePay sem fixá-las na regra", () => {
    assert.equal(createAccountFields(newAccount()).nameKey, "noh");
    assert.equal(createAccountFields({ ...newAccount(), name: "InfinitePay", type: "payment" }).type, "payment");
  });
  it("não permite saldo inicial inválido ou data impossível", () => {
    assert.throws(() => createAccountFields({ ...newAccount(), initialBalance: "100.50" }));
    assert.throws(() => createAccountFields({ ...newAccount(), balanceDate: "2026-02-30" }));
  });
  it("não aceita schoolId, id ou currentBalance informados pelo cliente", () => {
    for (const field of ["schoolId", "id", "currentBalance"]) {
      assert.throws(() => createAccountFields({ ...newAccount(), [field]: "forged" }));
    }
  });
  it("proíbe editar saldo inicial, data, default e schoolId", () => {
    for (const field of ["initialBalance", "balanceDate", "isDefault", "schoolId"]) {
      assert.throws(() => updateAccountFields({ [field]: "other" }));
    }
  });
  it("aceita nome, tipo e situação administrativa, sem alteração financeira", () => {
    assert.deepEqual(updateAccountFields({ name: "  Noh  ", active: false }),
      { name: "Noh", nameKey: "noh", active: false });
  });
  it("só aceita filtros booleanos explícitos", () => {
    assert.deepEqual(accountListFilters({ active: "true" }), { active: true });
    assert.deepEqual(accountListFilters({ active: "false" }), { active: false });
    assert.throws(() => accountListFilters({ active: "all" }));
  });
});

describe("Contas financeiras: operações do DataAccess (isoladas)", () => {
  it("gera ID e timestamps no servidor e ignora escolha de escola", async () => {
    const dao = make();
    const account = await dao.create(newAccount());
    assert.equal(account.id, ID);
    assert.equal(account.schoolId, "school-from-server");
    assert.equal(account.initialBalance, 2500.25);
    assert.equal(account.active, true);
  });
  it("lista apenas os registros da escola do servidor", async () => {
    const model = fakeModel();
    model.records.push({ schoolId: "another-school", id: "foreign", name: "Foreign", active: true });
    const dao = make(model);
    await dao.create(newAccount());
    const list = await dao.list({ active: "true", schoolId: "another-school" });
    assert.equal(list.length, 1);
    assert.equal(list[0].name, "Noh");
  });
  it("não retorna conta de outra escola nem ID inexistente", async () => {
    const dao = make();
    await expectCode(() => dao.get(ID), 404);
    await expectCode(() => dao.get("not-an-id"), 400);
  });
  it("converte colisões de índice único em 409", async () => {
    const dao = make();
    await dao.create(newAccount());
    await expectCode(() => dao.create(newAccount()), 409);
  });
  it("permite modificar campos administrativos preservando saldo inicial", async () => {
    const dao = make();
    await dao.create(newAccount());
    const updated = await dao.update(ID, { name: "Noh Principal", type: "payment" });
    assert.equal(updated.nameKey, "noh-principal");
    assert.equal(updated.initialBalance, 2500.25);
    assert.equal(updated.balanceDate, "2026-11-19");
  });
  it("não desativa a conta padrão", async () => {
    const dao = make();
    await dao.create({ ...newAccount(), isDefault: true });
    await expectCode(() => dao.update(ID, { active: false }), 409);
  });
  it("detecta conflito de edição concorrente", async () => {
    const model = fakeModel();
    const dao = make(model);
    await dao.create(newAccount());
    model.findOneAndUpdate = () => ({ lean: async () => null });
    await expectCode(() => dao.update(ID, { name: "Outra" }), 409);
  });
});

describe("Contas financeiras: contrato HTTP", () => {
  it("retorna 201 ao cadastrar e 200 ao consultar", async () => {
    const controller = new Controllers(make());
    assert.equal((await controller.create(newAccount())).statusCode, 201);
    assert.equal((await controller.list({})).statusCode, 200);
  });
  it("retorna 400, 404 e 409 sem expor erros internos", async () => {
    const controller = new Controllers(make());
    assert.equal((await controller.create({ name: "X" })).statusCode, 400);
    assert.equal((await controller.get(ID)).statusCode, 404);
    await controller.create(newAccount());
    assert.equal((await controller.create(newAccount())).statusCode, 409);
  });
  it("declara as cinco rotas esperadas", () => {
    assert.deepEqual(router.routes.map(({method,path}) => `${method} ${path}`),
      ["GET /balances", "GET /", "GET /:id", "POST /", "PATCH /:id"]);
  });
  it("registra as rotas no index sem substituir o módulo Financeiro", () => {
    const index = readFileSync(new URL("../../src/index.js", import.meta.url), "utf8");
    assert.match(index, /app\.use\("\/financial-accounts", financialAccountsRouter\)/);
    assert.match(index, /app\.use\("\/financial", financialRouter\)/);
    assert.match(index, /await FinancialAccount\.init\(\)/);
  });
});
