import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { transferCreateFields, sameTransferRequest } from "../../src/modules/financialTransfers/financialTransfersRules.js";

const NOH = "ec351a0e-ff49-4aae-97c0-9c3778c39f33";
const INFINITE = "9711a5f7-69d3-408f-bbf6-627572287dc9";
const SCHOOL = "default";
const STAMP = "2026-11-20T15:00:00.000Z";
const fixedBody = () => ({ fromAccountId: NOH, toAccountId: INFINITE,
  amount: 600.25, note: "Repasses", initiatorKey: "vanessa", idempotencyKey: "req_transfer_001" });

const expectCode = (action, code) => assert.rejects(action, error => error.statusCode === code);
const mocked = src => `data:text/javascript,${encodeURIComponent(src)}`;

/* EN: Use dependency injection to test the transaction API without a live MongoDB server.
   PT: Usa injeção de dependências para testar a API sem MongoDB real. */
registerHooks({ resolve(specifier, _context, nextResolve) {
  if (specifier === "../../models/FinancialTransfer.js" ||
      specifier === "../../models/FinancialAccount.js") {
    return { url: mocked("export default {};"), shortCircuit: true };
  }
  if (specifier === "../expenses/expenseRules.js") {
    return { url: mocked(`export const schoolId = () => "${SCHOOL}";`), shortCircuit: true };
  }
  if (specifier === "../financialAccounts/financialAccountsBalanceDataAccess.js") {
    return { url: mocked("export default class BalanceDataAccess {}"), shortCircuit: true };
  }
  if (specifier === "express") {
    return { url: mocked(`export default { Router: () => {
      const routes = [];
      return { routes, use: (handler) => routes.push({ method: "MIDDLEWARE", handler }), get: (path, handler) => routes.push({ path, handler, method: "GET" }), post: (path, handler) => routes.push({ path, handler, method: "POST" }) };
    }};`), shortCircuit: true };
  }
  return nextResolve(specifier, _context);
}});
const { default: TransferDAO } = await import("../../src/modules/financialTransfers/financialTransfersDataAccess.js");
const { default: TransferController } = await import("../../src/modules/financialTransfers/financialTransfersControllers.js");
const { default: routes } = await import("../../src/modules/financialTransfers/financialTransfersRouter.js");

const make = (options = {}) => {
  const history = [];
  const calls = { session: 0, commit: 0, ends: 0, locks: [], balances: 0, created: 0 };
  const accounts = [
    { id: NOH, schoolId: SCHOOL, active: true, balanceDate: "2026-06-30" },
    { id: INFINITE, schoolId: SCHOOL, active: true, balanceDate: "2026-06-30" }
  ];
  const session = {
    withTransaction: async fn => { calls.commit++; await fn(); },
    endSession: async () => { calls.ends++; }
  };
  const transferModel = {
    db: { startSession: async () => { calls.session++; return session; } },
    findOne(query) {
      const q = { session() { return q; }, lean: async () => history.find(record =>
        record.schoolId === query.schoolId && record.idempotencyKey === query.idempotencyKey) ?? null };
      return q;
    },
    async create([payload], options) {
      assert.equal(options.session, session);
      if (options.forceError) throw options.forceError;
      calls.created++;
      history.push(payload);
      return [{ toObject: () => payload }];
    }
  };
  const accountModel = {
    findOneAndUpdate(query, update, options) {
      assert.equal(options.session, session);
      assert.deepEqual(update, { $inc: { __v: 1 } });
      calls.locks.push(query.id);
      const found = accounts.find(a => a.id === query.id && a.schoolId === query.schoolId && a.active === query.active);
      return { lean: async () => found ?? null };
    }
  };
  const balanceService = {
    getBalances: async (filters, metadata) => {
      assert.equal(filters.asOf, "2026-11-20");
      assert.equal(metadata.session, session);
      calls.balances++;
      return { accounts: [{ id: NOH, available: true, balance: options.balance ?? 700 },
        { id: INFINITE, available: true, balance: 50 }] };
    }
  };
  const dao = new TransferDAO({ transferModel, accountModel, balanceService,
    resolveSchoolId: () => SCHOOL, clock: () => STAMP,
    makeId: () => "6f000000-0000-4000-8000-000000000011" });
  return { dao, accounts, history, calls, transferModel, session };
};

describe("Commit 11: validação de transferência", () => {
  it("aceita as duas contas dinâmicas, valor e responsável conhecido", () => {
    const data = transferCreateFields(fixedBody());
    assert.equal(data.createdBy.name, "Vanessa");
    assert.equal(data.fromAccountId, NOH);
    assert.equal(data.note, "Repasses");
  });
  it("rejeita IDs iguais, inválidos e valores não positivos", () => {
    for (const body of [{ toAccountId: NOH }, { fromAccountId: "Noh" },
      { amount: 0 }, { amount: 1.001 }, { amount: "600.25" }]) {
      assert.throws(() => transferCreateFields({ ...fixedBody(), ...body }), e => e.statusCode === 400);
    }
  });
  it("não permite escolher escola, IDs, status, data ou saldo no corpo", () => {
    for (const field of ["schoolId", "id", "transferredAt", "status", "currentBalance", "createdBy"]) {
      assert.throws(() => transferCreateFields({ ...fixedBody(), [field]: "forjado" }), e => e.statusCode === 400);
    }
  });
  it("rejeita observação longa, tipo inesperado e chave de operação inválida", () => {
    for (const body of [{ note: "x".repeat(501) }, { note: 12 },
      { idempotencyKey: "x" }, { idempotencyKey: "x y z" }]) {
      assert.throws(() => transferCreateFields({ ...fixedBody(), ...body }), e => e.statusCode === 400);
    }
  });
  it("exige responsável autorizado Pety ou Vanessa", () => {
    for (const initiatorKey of [undefined, "outro"]) {
      const body = fixedBody();
      if (initiatorKey === undefined) delete body.initiatorKey;
      else body.initiatorKey = initiatorKey;
      assert.throws(() => transferCreateFields(body), e => e.statusCode === 400);
    }
  });
  it("repete apenas uma operação com os mesmos campos", () => {
    const request = transferCreateFields(fixedBody());
    assert.equal(sameTransferRequest({ ...request }, request), true);
    assert.equal(sameTransferRequest({ ...request, amount: 1 }, request), false);
    assert.equal(sameTransferRequest({ ...request, createdBy: { key: "pety" } }, request), false);
  });
});

describe("Commit 11: registro transacional isolado", () => {
  it("registra uma transferência com os dois bloqueios e sem escrever despesa/provento", async () => {
    const { dao, history, calls } = make();
    const result = await dao.create(fixedBody());
    assert.equal(result.reused, false);
    assert.equal(result.transfer.amount, 600.25);
    assert.equal(result.transfer.status, "completed");
    assert.equal(result.transfer.schoolId, SCHOOL);
    assert.equal(result.transfer.transferredAt, STAMP);
    assert.equal(result.transfer.createdBy.key, "vanessa");
    assert.equal(history.length, 1);
    assert.equal(calls.created, 1);
    assert.deepEqual(calls.locks, [NOH, INFINITE].sort());
    assert.equal(calls.balances, 1);
    assert.equal(calls.commit, 1);
    assert.equal(calls.ends, 1);
  });
  it("ao repetir a chave com os mesmos dados retorna a operação, sem novo débito", async () => {
    const { dao, calls } = make();
    await dao.create(fixedBody());
    const result = await dao.create(fixedBody());
    assert.equal(result.reused, true);
    assert.equal(calls.created, 1);
    assert.equal(calls.session, 1);
  });
  it("bloqueia o reuso da chave com outro valor", async () => {
    const { dao } = make();
    await dao.create(fixedBody());
    await expectCode(() => dao.create({ ...fixedBody(), amount: 50 }), 409);
  });
  it("rejeita contas inativas, ausentes e de outra escola", async () => {
    for (const mode of ["inactive", "absent", "other-school"]) {
      const { dao, accounts, calls } = make();
      if (mode === "inactive") accounts[1].active = false;
      if (mode === "absent") accounts.pop();
      if (mode === "other-school") accounts[1].schoolId = "foreign";
      await expectCode(() => dao.create(fixedBody()), 404);
      assert.equal(calls.created, 0);
      assert.equal(calls.ends, 1);
    }
  });
  it("não aceita transferir acima do saldo disponível", async () => {
    const { dao, calls } = make({ balance: 600 });
    await expectCode(() => dao.create(fixedBody()), 409);
    assert.equal(calls.created, 0);
    assert.equal(calls.ends, 1);
  });
  it("permite transferir o saldo inteiro sem permitir saldo insuficiente", async () => {
    const { dao, calls } = make({ balance: 600.25 });
    await dao.create(fixedBody());
    assert.equal(calls.created, 1);
  });
  it("rejeita conta com data-base posterior à transferência", async () => {
    const { dao, accounts, calls } = make();
    accounts[0].balanceDate = "2026-12-01";
    await expectCode(() => dao.create(fixedBody()), 409);
    assert.equal(calls.created, 0);
  });
  it("encerra a sessão mesmo quando o cálculo de saldo falha", async () => {
    const { dao, calls } = make();
    dao.balanceService.getBalances = async () => { throw new Error("Mongo indisponível"); };
    await assert.rejects(dao.create(fixedBody()), /Mongo indisponível/);
    assert.equal(calls.ends, 1);
  });
  it("não cadastra fora da transação quando o banco não a suporta", async () => {
    const { dao, transferModel, calls } = make();
    transferModel.db.startSession = async () => ({
      withTransaction: async () => { throw new Error("Transaction numbers are only allowed on a replica set"); },
      endSession: async () => { calls.ends++; }
    });
    await assert.rejects(dao.create(fixedBody()), /replica set/);
    assert.equal(calls.created, 0);
  });
  it("converte uma colisão de índice único em replay seguro", async () => {
    const { dao, transferModel, history, calls } = make();
    transferModel.create = async ([payload]) => {
      history.push(payload); // Imitates the competing request completing before this one.
      throw Object.assign(new Error("E11000"), { code: 11000 });
    };
    const result = await dao.create(fixedBody());
    assert.equal(result.reused, true);
    assert.equal(calls.ends, 1);
  });
});

describe("Commit 11: HTTP e integração", () => {
  it("responde 201 para novo registro e 200 para retransmissão", async () => {
    const controller = new TransferController(make().dao);
    assert.equal((await controller.create(fixedBody())).statusCode, 201);
    assert.equal((await controller.create(fixedBody())).statusCode, 200);
  });
  it("retorna erros de validação e saldo sem expor o erro do banco", async () => {
    const controller = new TransferController(make({ balance: 0 }).dao);
    assert.equal((await controller.create({ ...fixedBody(), fromAccountId: INFINITE, toAccountId: INFINITE })).statusCode, 400);
    assert.equal((await controller.create(fixedBody())).statusCode, 409);
    const failed = new TransferController({ create: async () => { throw new Error("senha do banco"); } });
    assert.deepEqual(await failed.create(fixedBody()), { success: false, statusCode: 500,
      body: "Não foi possível registrar a transferência." });
  });
  it("bloqueia novas transferências em produção enquanto não existe autenticação", async () => {
    const route = routes.routes.find(route => route.method === "MIDDLEWARE");
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      let response;
      const res = { status(code) { response = { code }; return this; }, send(body) { response.body = body; } };
      await route.handler({ body: fixedBody() }, res, () => { throw new Error("Não deveria liberar produção"); });
      assert.equal(response.code, 403);
      assert.match(response.body.body, /autenticação/);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
  it("registra POST /financial-transfers sem substituir as demais rotas", () => {
    assert.ok(routes.routes.some(route => route.path === "/" && route.method === "POST"));
    const index = readFileSync(new URL("../../src/index.js", import.meta.url), "utf8");
    assert.match(index, /app\.use\("\/financial-transfers", financialTransfersRouter\)/);
    assert.match(index, /await FinancialTransfer\.init\(\)/);
    assert.match(index, /app\.use\("\/financial-accounts", financialAccountsRouter\)/);
  });
});
