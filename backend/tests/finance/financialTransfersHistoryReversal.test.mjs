import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";
import { transferHistoryFilters, transferReversalFields } from "../../src/modules/financialTransfers/financialTransfersRules.js";
import { calculateFinancialAccountBalances } from "../../src/modules/financialAccounts/financialAccountsBalanceRules.js";

const SCHOOL = "default";
const NOH = "ec351a0e-ff49-4aae-97c0-9c3778c39f33";
const INFINITE = "9711a5f7-69d3-408f-bbf6-627572287dc9";
const TRANSFER_ID = "6f000000-0000-4000-8000-000000000011";
const original = () => ({
  id: TRANSFER_ID, schoolId: SCHOOL, fromAccountId: NOH, toAccountId: INFINITE,
  amount: 300, status: "completed", transferredAt: "2026-07-08T15:00:00.000Z",
  createdAt: "2026-07-08T15:00:00.000Z", updatedAt: "2026-07-08T15:00:00.000Z"
});
const accounts = () => [
  { id: NOH, name: "Noh", type: "bank", initialBalance: 800, balanceDate: "2026-06-30", active: true },
  { id: INFINITE, name: "InfinitePay", type: "payment", initialBalance: 200, balanceDate: "2026-06-30", active: true }
];
const value = (result, id) => result.accounts.find(record => record.id === id).balance;
const expectCode = (call, statusCode) => assert.rejects(call, error => error.statusCode === statusCode);

/* EN: Reversal rules reject client-controlled audit and financial fields.
   PT: Regras de estorno rejeitam campos financeiros ou de auditoria definidos pelo cliente. */
describe("Commit 12: filtros de histórico e validação de estorno", () => {
  it("usa paginação limitada e não expõe contas de outra escola", () => {
    assert.deepEqual(transferHistoryFilters(), { filter: {}, page: 1, limit: 20 });
    assert.deepEqual(transferHistoryFilters({ accountId: NOH, status: "reversed", page: "2", limit: "30" }),
      { filter: { accountId: NOH, status: "reversed" }, page: 2, limit: 30 });
  });
  it("rejeita filtros desconhecidos, IDs e status inválidos", () => {
    for (const filters of [{ schoolId: "outside" }, { accountId: "Noh" }, { status: "pending" },
      { page: "0" }, { page: "1.5" }, { page: "1001" }, { limit: "101" }, { limit: "-1" },
      { limit: "abc" }, { $where: "forged" }, []]) {
      assert.throws(() => transferHistoryFilters(filters), e => e.statusCode === 400);
    }
  });
  it("aceita justificativa aparada e responsável fixo", () => {
    assert.deepEqual(transferReversalFields({ reason: "  Lançamento incorreto  ", initiatorKey: "pety" }),
      { reversalReason: "Lançamento incorreto",
        reversedBy: { kind: "fixed", key: "pety", name: "Pety", userId: null } });
  });
  it("exige responsável e motivo adequado sem permitir status ou datas fornecidos", () => {
    for (const body of [{ reason: "curto" }, { initiatorKey: "pety" },
      { reason: "x", initiatorKey: "pety" }, { reason: "x".repeat(501), initiatorKey: "pety" },
      { reason: 123, initiatorKey: "pety" }, { reason: "Justificativa válida", initiatorKey: "desconhecido" },
      { reason: "Justificativa válida", initiatorKey: "pety", status: "reversed" },
      { reason: "Justificativa válida", initiatorKey: "pety", reversedAt: "2026-11-20" },
      { reason: "Justificativa válida", initiatorKey: "pety", schoolId: "outsider" }]) {
      assert.throws(() => transferReversalFields(body), e => e.statusCode === 400);
    }
  });
});

/* EN: Reversal entries affect balance only on the reversal day; historic dates stay accurate.
   PT: Estornos só afetam o saldo na data do estorno; datas históricas permanecem corretas. */
describe("Commit 12: cálculo histórico de saldos e estornos", () => {
  const reversed = () => ({ ...original(), status: "reversed",
    reversedAt: "2026-11-20T15:00:00.000Z", reversalReason: "Pagamento indevido" });
  it("considera a saída antes do estorno", () => {
    const result = calculateFinancialAccountBalances({ accounts: accounts(), transfers: [reversed()] }, "2026-07-31");
    assert.equal(value(result, NOH), 500);
    assert.equal(value(result, INFINITE), 500);
  });
  it("reverte no dia correto sem alterar o consolidado", () => {
    const before = calculateFinancialAccountBalances({ accounts: accounts(), transfers: [reversed()] }, "2026-11-19");
    const after = calculateFinancialAccountBalances({ accounts: accounts(), transfers: [reversed()] }, "2026-11-20");
    assert.equal(value(before, NOH), 500);
    assert.equal(value(after, NOH), 800);
    assert.equal(value(after, INFINITE), 200);
    assert.equal(before.totalBalance, 1000);
    assert.equal(after.totalBalance, 1000);
    assert.equal(after.accounts[0].transfersIn, 300);
    assert.equal(after.accounts[1].transfersOut, 300);
  });
  it("estorno no mesmo dia resulta em saldo líquido neutro", () => {
    const sameDay = { ...reversed(), reversedAt: "2026-07-08T18:00:00.000Z" };
    const result = calculateFinancialAccountBalances({ accounts: accounts(), transfers: [sameDay] }, "2026-07-08");
    assert.equal(value(result, NOH), 800);
    assert.equal(value(result, INFINITE), 200);
  });
  it("estorno depois de saldo-base inclui retorno de transferência anterior à base", () => {
    const data = accounts();
    data[0].initialBalance = 500;
    data[1].initialBalance = 500;
    data[0].balanceDate = data[1].balanceDate = "2026-07-31";
    const result = calculateFinancialAccountBalances({ accounts: data, transfers: [reversed()] }, "2026-11-20");
    assert.equal(value(result, NOH), 800);
    assert.equal(value(result, INFINITE), 200);
  });
  it("rejeita estorno sem data ou anterior à transferência", () => {
    for (const bad of [{ ...original(), status: "reversed" },
      { ...original(), status: "reversed", reversedAt: "2026-07-01T00:00:00.000Z" }]) {
      assert.throws(() => calculateFinancialAccountBalances({ accounts: accounts(), transfers: [bad] }, "2026-11-20"),
        e => e.statusCode === 500);
    }
  });
});

const source = text => `data:text/javascript,${encodeURIComponent(text)}`;
/* EN: Isolated dependency injection does NOT claim MongoDB integration has been exercised.
   PT: Injeção isolada de dependências NÃO substitui um teste de integração com MongoDB. */
registerHooks({ resolve(specifier, _context, nextResolve) {
  if (specifier === "../../models/FinancialTransfer.js" || specifier === "../../models/FinancialAccount.js") {
    return { url: source("export default {};"), shortCircuit: true };
  }
  if (specifier === "../expenses/expenseRules.js") {
    return { url: source(`export const schoolId = () => "${SCHOOL}";`), shortCircuit: true };
  }
  if (specifier === "../financialAccounts/financialAccountsBalanceDataAccess.js") {
    return { url: source("export default class BalanceDataAccess {}"), shortCircuit: true };
  }
  if (specifier === "express") {
    return { url: source(`export default { Router: () => {
      const routes = [];
      return { routes, use: handler => routes.push({ method: "MIDDLEWARE", handler }),
        get: (path, handler) => routes.push({ path, handler, method: "GET" }),
        post: (path, handler) => routes.push({ path, handler, method: "POST" }) };
    } };`), shortCircuit: true };
  }
  return nextResolve(specifier, _context);
}});
const { default: DAO } = await import("../../src/modules/financialTransfers/financialTransfersDataAccess.js");
const { default: Controller } = await import("../../src/modules/financialTransfers/financialTransfersControllers.js");
const { default: router } = await import("../../src/modules/financialTransfers/financialTransfersRouter.js");

const setup = ({ state = "completed", receiverBalance = 500, time = "2026-11-20T15:00:00.000Z" } = {}) => {
  const list = [{ ...original(), status: state }];
  const identities = [{ id: NOH, schoolId: SCHOOL, balanceDate: "2026-06-30", active: true },
    { id: INFINITE, schoolId: SCHOOL, balanceDate: "2026-06-30", active: true }];
  const calls = { sessions: 0, ended: 0, locks: [], updates: 0, count: 0, matches: [] };
  const matches = (record, where) => record.schoolId === where.schoolId &&
    (!where.id || record.id === where.id) && (!where.status || record.status === where.status) &&
    (!where.$or || where.$or.some(cond => Object.keys(cond).some(key => record[key] === cond[key])));
  const session = {
    withTransaction: async cb => {
      const saved = structuredClone(list);
      try { await cb(); } catch (error) { list.splice(0, list.length, ...saved); throw error; }
    }, endSession: async () => { calls.ended++; }
  };
  const transferModel = {
    db: { startSession: async () => { calls.sessions++; return session; } },
    findOne(where) { return { session() { return this; }, lean: async () => list.find(item => matches(item, where)) ?? null }; },
    countDocuments: async where => { calls.count++; return list.filter(item => matches(item, where)).length; },
    find(where) {
      const filtered = list.filter(item => matches(item, where));
      const q = { sort() { return q; }, skip(offset) { q.offset = offset; return q; },
        limit(limit) { q.max = limit; return q; },
        lean: async () => filtered.sort((a, b) => b.transferredAt.localeCompare(a.transferredAt) || b.id.localeCompare(a.id))
          .slice(q.offset ?? 0, (q.offset ?? 0) + (q.max ?? filtered.length)) };
      return q;
    },
    findOneAndUpdate(where, change, options) {
      assert.equal(options.session, session);
      assert.equal(options.runValidators, true);
      const matching = list.find(item => matches(item, where));
      if (matching) { calls.updates++; Object.assign(matching, change.$set); }
      return { lean: async () => matching ? { ...matching } : null };
    }
  };
  const accountModel = {
    findOneAndUpdate(where, update, options) {
      assert.equal(options.session, session);
      assert.deepEqual(update, { $inc: { __v: 1 } });
      calls.locks.push(where.id);
      const found = identities.find(item => item.id === where.id && item.schoolId === where.schoolId);
      return { lean: async () => found ?? null };
    }
  };
  const balanceService = { getBalances: async (filter, options) => {
    assert.deepEqual(filter, { asOf: "2026-11-20" });
    assert.equal(options.session, session);
    return { accounts: [{ id: NOH, available: true, balance: 100 },
      { id: INFINITE, available: true, balance: receiverBalance }] };
  } };
  const dao = new DAO({ transferModel, accountModel, balanceService,
    resolveSchoolId: () => SCHOOL, clock: () => time });
  return { dao, list, calls, identities, balanceService, transferModel };
};

const body = () => ({ reason: "Transferência cadastrada por engano", initiatorKey: "vanessa" });

describe("Commit 12: histórico e filtros no DataAccess", () => {
  it("lista histórico paginado por escola, em ordem decrescente", async () => {
    const { dao, list } = setup();
    list.push({ ...original(), id: "fa000000-0000-4000-8000-000000000099", schoolId: "outra-escola" });
    const result = await dao.list({ limit: "10" });
    assert.equal(result.total, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].schoolId, SCHOOL);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
  });
  it("filtro por conta inclui transferências de entrada e saída", async () => {
    const { dao, list } = setup();
    list.push({ ...original(), id: "fa000000-0000-4000-8000-000000000098", fromAccountId: INFINITE, toAccountId: NOH });
    assert.equal((await dao.list({ accountId: NOH })).total, 2);
    assert.equal((await dao.list({ accountId: INFINITE })).total, 2);
    assert.equal((await dao.list({ status: "reversed" })).total, 0);
  });
  it("retorna detalhes pelo ID apenas da escola autorizada", async () => {
    const { dao } = setup();
    assert.equal((await dao.getById(TRANSFER_ID)).id, TRANSFER_ID);
    await expectCode(() => dao.getById("fa000000-0000-4000-8000-000000000099"), 404);
    await expectCode(() => dao.getById("id-inválido"), 400);
  });
  it("não permite filtrar outra escola nem realizar consulta sem filtro válido", async () => {
    const { dao } = setup();
    await expectCode(() => dao.list({ schoolId: "outra" }), 400);
    await expectCode(() => dao.list({ limit: "999999" }), 400);
  });
});

describe("Commit 12: estorno transacional", () => {
  it("estorna, mantém o valor original e grava responsável, data e justificativa", async () => {
    const { dao, list, calls } = setup();
    const result = await dao.reverse(TRANSFER_ID, body());
    assert.equal(result.status, "reversed");
    assert.equal(result.amount, 300);
    assert.equal(result.fromAccountId, NOH);
    assert.equal(result.toAccountId, INFINITE);
    assert.equal(result.reversedAt, "2026-11-20T15:00:00.000Z");
    assert.equal(result.reversedBy.key, "vanessa");
    assert.equal(result.reversalReason, body().reason);
    assert.equal(calls.updates, 1);
    assert.deepEqual(calls.locks, [NOH, INFINITE].sort());
    assert.equal(calls.ended, 1);
    assert.equal(list.length, 1);
  });
  it("não permite estornar duas vezes", async () => {
    const { dao, calls } = setup();
    await dao.reverse(TRANSFER_ID, body());
    await expectCode(() => dao.reverse(TRANSFER_ID, body()), 409);
    assert.equal(calls.updates, 1);
    assert.equal(calls.ended, 2);
  });
  it("bloqueia estorno que deixaria a conta de destino sem saldo", async () => {
    const { dao, calls } = setup({ receiverBalance: 299.99 });
    await expectCode(() => dao.reverse(TRANSFER_ID, body()), 409);
    assert.equal(calls.updates, 0);
    assert.equal(calls.ended, 1);
  });
  it("permite estornar usando todo o saldo da conta que fará a devolução", async () => {
    const { dao, calls } = setup({ receiverBalance: 300 });
    await dao.reverse(TRANSFER_ID, body());
    assert.equal(calls.updates, 1);
  });
  it("rejeita transferências de outra escola e IDs inexistentes", async () => {
    const { dao, list, calls } = setup();
    list[0].schoolId = "outra-escola";
    await expectCode(() => dao.reverse(TRANSFER_ID, body()), 404);
    await expectCode(() => dao.reverse("inválido", body()), 400);
    assert.equal(calls.updates, 0);
  });
  it("bloqueia estorno quando a origem ou o destino desapareceu", async () => {
    const { dao, identities, calls } = setup();
    identities.pop();
    await expectCode(() => dao.reverse(TRANSFER_ID, body()), 404);
    assert.equal(calls.updates, 0);
  });
  it("não cria receita, despesa, transferências extras ou altera a data original", async () => {
    const { dao, list } = setup();
    const previous = list[0].transferredAt;
    await dao.reverse(TRANSFER_ID, body());
    assert.equal(list.length, 1);
    assert.equal(list[0].transferredAt, previous);
    assert.equal(list[0].status, "reversed");
  });
  it("rejeita um estorno anterior à operação original", async () => {
    const { dao } = setup({ time: "2026-07-01T12:00:00.000Z" });
    await expectCode(() => dao.reverse(TRANSFER_ID, body()), 409);
  });
  it("fecha sessão após erro durante cálculo financeiro e não modifica transferência", async () => {
    const { dao, list, calls } = setup();
    dao.balanceService.getBalances = async () => { throw new Error("Mongo indisponível"); };
    await assert.rejects(() => dao.reverse(TRANSFER_ID, body()), /Mongo indisponível/);
    assert.equal(list[0].status, "completed");
    assert.equal(calls.ended, 1);
  });
  it("não executa estorno fora de transação quando o MongoDB não suporta transações", async () => {
    const { dao, transferModel, list, calls } = setup();
    transferModel.db.startSession = async () => ({
      withTransaction: async () => { throw new Error("replica set required"); },
      endSession: async () => { calls.ended++; }
    });
    await assert.rejects(() => dao.reverse(TRANSFER_ID, body()), /replica set required/);
    assert.equal(list[0].status, "completed");
    assert.equal(calls.ended, 1);
  });
});

describe("Commit 12: respostas HTTP e bloqueio em produção", () => {
  it("controllers respondem 200 para consultas e estorno", async () => {
    const { dao } = setup();
    const controller = new Controller(dao);
    assert.equal((await controller.list({})).statusCode, 200);
    assert.equal((await controller.getById(TRANSFER_ID)).statusCode, 200);
    assert.equal((await controller.reverse(TRANSFER_ID, body())).statusCode, 200);
  });
  it("controllers respondem 404/409 e ocultam erros internos", async () => {
    const { dao } = setup({ receiverBalance: 0 });
    const controller = new Controller(dao);
    assert.equal((await controller.getById("fa000000-0000-4000-8000-000000000099")).statusCode, 404);
    assert.equal((await controller.reverse(TRANSFER_ID, body())).statusCode, 409);
    const broken = new Controller({ list: async () => { throw new Error("secret Mongo URI"); } });
    assert.equal((await broken.list({})).statusCode, 500);
    assert.doesNotMatch(JSON.stringify(await broken.list({})), /secret Mongo URI/);
  });
  it("declara listagem, detalhes, cadastro e estorno nas rotas", () => {
    assert.ok(router.routes.some(r => r.method === "GET" && r.path === "/"));
    assert.ok(router.routes.some(r => r.method === "GET" && r.path === "/:id"));
    assert.ok(router.routes.some(r => r.method === "POST" && r.path === "/"));
    assert.ok(router.routes.some(r => r.method === "POST" && r.path === "/:id/reverse"));
  });
  it("bloqueia em produção o histórico e o estorno sem autenticação", () => {
    const middleware = router.routes.find(r => r.method === "MIDDLEWARE").handler;
    const prior = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      let response;
      const res = { status(code) { response = { code }; return this; },
        send(body) { response.body = body; return this; } };
      middleware({}, res, () => { throw new Error("Não deve liberar acesso em produção"); });
      assert.equal(response.code, 403);
    } finally {
      if (prior === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prior;
    }
  });
});
