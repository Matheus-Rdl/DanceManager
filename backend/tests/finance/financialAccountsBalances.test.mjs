import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import {
  nextBalanceDay, balanceAsOf, calculateFinancialAccountBalances
} from "../../src/modules/financialAccounts/financialAccountsBalanceRules.js";

const NOH = "noh-id";
const INFINITE = "infinite-id";
const accounts = () => [
  { id: NOH, schoolId: "school-test", name: "Noh", type: "bank", active: true,
    isDefault: true, initialBalance: 1000, balanceDate: "2026-06-30" },
  { id: INFINITE, schoolId: "school-test", name: "InfinitePay", type: "payment", active: true,
    isDefault: false, initialBalance: 0, balanceDate: "2026-06-30" }
];
const fixture = () => ({ accounts: accounts(),
  payments: [
    { accountId: NOH, amount: 100.25, status: "confirmed", paidAt: "2026-07-01T16:00:00.000Z" },
    { accountId: NOH, amount: 49.75, paidAt: "2026-07-02" },
    { accountId: INFINITE, amount: 180, status: "confirmed", paidAt: "2026-07-03" },
    { accountId: INFINITE, amount: 999, status: "reversed", paidAt: "2026-07-03" },
    { accountId: NOH, amount: 20, status: "confirmed", paidAt: "2026-06-30T12:00:00Z" },
    { accountId: NOH, amount: 30, status: "confirmed", paidAt: "2026-08-01" },
    { accountId: "another-account", amount: 500, status: "confirmed", paidAt: "2026-07-01" }
  ],
  expenses: [
    { accountId: NOH, status: "paid", paidAmount: 80.50, paidAt: "2026-07-02" },
    { accountId: NOH, status: "pending", paidAmount: 600, paidAt: "2026-07-02" },
    { accountId: INFINITE, status: "paid", paidAmount: 10.25, paidAt: "2026-07-03" }
  ],
  revenues: [
    { accountId: NOH, status: "received", receivedAmount: 35.55, receivedAt: "2026-07-02" },
    { accountId: INFINITE, status: "received", receivedAmount: 29.99, receivedAt: "2026-07-03" },
    { accountId: NOH, status: "pending", receivedAmount: 999, receivedAt: "2026-07-02" }
  ]
});
const calc = (data = fixture(), asOf = "2026-07-31") => calculateFinancialAccountBalances(data, asOf);
const account = (response, id) => response.accounts.find(item => item.id === id);

describe("Commit 09: cálculo puro dos saldos", () => {
  it("respeita início em 01/07 após saldo-base de 30/06 e não duplica o próprio dia 30", () => {
    const result = calc();
    assert.equal(account(result, NOH).balanceDate, "2026-06-30");
    assert.equal(account(result, NOH).balance, 1105.05);
  });
  it("soma separadamente pagamentos parciais e proventos, usando centavos", () => {
    const result = account(calc(), NOH);
    assert.equal(result.monthlyFeesReceived, 150);
    assert.equal(result.otherRevenuesReceived, 35.55);
    assert.equal(result.received, 185.55);
  });
  it("considera despesas pagas, não o valor previsto de despesas pendentes", () => {
    assert.equal(account(calc(), NOH).paid, 80.5);
  });
  it("ignora pagamentos estornados e proventos pendentes", () => {
    const result = calc();
    assert.equal(account(result, INFINITE).balance, 199.74);
  });
  it("não inclui movimentos de contas externas nem posteriores à data de consulta", () => {
    const result = calc();
    assert.equal(result.totalBalance, 1304.79);
    assert.equal(result.asOf, "2026-07-31");
  });
  it("apresenta o saldo inicial no próprio dia-base, sem novos movimentos", () => {
    assert.equal(account(calc(fixture(), "2026-06-30"), NOH).balance, 1000);
  });
  it("recalcula o saldo quando valores ou datas dos lançamentos forem corrigidos", () => {
    const data = fixture();
    data.expenses[0].paidAmount = 100.50;
    assert.equal(account(calc(data), NOH).balance, 1085.05);
  });
  it("inclui também saldos de contas desativadas no consolidado", () => {
    const data = fixture();
    data.accounts[1].active = false;
    assert.equal(calc(data).totalBalance, 1304.79);
  });
  it("suporta saldo inicial negativo com valores em duas casas decimais", () => {
    const data = fixture();
    data.accounts[0].initialBalance = -10.50;
    assert.equal(account(calc(data), NOH).balance, 94.55);
  });
  it("retorna saldo indefinido quando a data-base da conta ainda não ocorreu", () => {
    const data = fixture();
    data.accounts[1].balanceDate = "2026-09-01";
    const result = calc(data);
    assert.equal(result.complete, false);
    assert.equal(result.totalBalance, null);
    assert.equal(account(result, INFINITE).balance, null);
    assert.equal(account(result, NOH).balance, 1105.05);
  });
  it("não inventa lançamentos quando o banco ainda não tem contas", () => {
    assert.deepEqual(calc({ accounts: [] }), { asOf: "2026-07-31", accounts: [], complete: true, totalBalance: 0 });
  });
  it("não adiciona um currentBalance persistido aos dados retornados", () => {
    assert.equal(Object.hasOwn(account(calc(), NOH), "currentBalance"), false);
  });
  it("rejeita cadastro de conta com valor financeiro inválido", () => {
    const data = fixture(); data.accounts[0].initialBalance = 1.001;
    assert.throws(() => calc(data), error => error.statusCode === 500);
  });
  it("preserva diferentes datas-base para contas criadas mais tarde", () => {
    const data = fixture();
    data.accounts[1].balanceDate = "2026-07-02";
    assert.equal(account(calc(data), INFINITE).balance, 199.74);
    data.accounts[1].balanceDate = "2026-07-03";
    assert.equal(account(calc(data), INFINITE).balance, 0);
  });
  it("calcula calendários reais e rejeita datas futuras ou inválidas", () => {
    assert.equal(nextBalanceDay("2026-06-30"), "2026-07-01");
    assert.equal(nextBalanceDay("2028-02-28"), "2028-02-29");
    assert.equal(balanceAsOf(undefined, "2026-11-20"), "2026-11-20");
    assert.throws(() => balanceAsOf("2026-11-21", "2026-11-20"), error => error.statusCode === 400);
    assert.throws(() => balanceAsOf("2026-02-30", "2026-11-20"), error => error.statusCode === 400);
  });
});

/* EN: A small in-memory query double tests the read-only data-access layer without packages or MongoDB.
   PT: Simulação de consultas valida a camada somente de leitura sem pacotes externos ou MongoDB. */
const source = code => `data:text/javascript,${encodeURIComponent(code)}`;
registerHooks({ resolve(specifier, context, nextResolve) {
  if (["../../models/FinancialAccount.js", "../../models/Payment.js", "../../models/Expense.js",
       "../../models/Revenue.js", "../../models/FinancialTransfer.js"].includes(specifier)) {
    return { url: source("export default {};"), shortCircuit: true };
  }
  if (specifier === "../expenses/expenseRules.js") {
    return { url: source('export const schoolId = () => "school-test";'), shortCircuit: true };
  }
  return nextResolve(specifier, context);
}});
const { default: BalanceDAO } = await import("../../src/modules/financialAccounts/financialAccountsBalanceDataAccess.js");

const fakeModel = (records, queries) => ({
  find(query) {
    queries.push(query);
    const matched = records.filter(record => Object.entries(query).every(([key, value]) => {
      if (key === "$or") return value.some(branch => Object.entries(branch).every(([name, rule]) =>
        rule.$in ? rule.$in.includes(record[name]) : rule === record[name]));
      if (value && typeof value === "object") {
        if (value.$in && !value.$in.includes(record[key])) return false;
        if (value.$ne !== undefined && value.$ne === record[key]) return false;
        if (value.$gte !== undefined && record[key] < value.$gte) return false;
        if (value.$lt !== undefined && record[key] >= value.$lt) return false;
        return true;
      }
      return record[key] === value;
    }));
    const queryChain = { select() { return queryChain; }, sort() { return queryChain; },
      session() { return queryChain; }, lean: async () => matched };
    return queryChain;
  }
});
const makeDAO = (data = fixture(), school = "school-test") => {
  const queries = { accounts: [], payments: [], expenses: [], revenues: [], transfers: [] };
  return { queries, dao: new BalanceDAO({
    accountModel: fakeModel(data.accounts, queries.accounts),
    paymentModel: fakeModel(data.payments, queries.payments),
    expenseModel: fakeModel(data.expenses.map(e => ({ ...e, schoolId: "school-test" })), queries.expenses),
    revenueModel: fakeModel(data.revenues.map(r => ({ ...r, schoolId: "school-test" })), queries.revenues),
    transferModel: fakeModel(data.transfers ?? [], queries.transfers),
    resolveSchoolId: () => school, today: () => "2026-11-20"
  }) };
};

describe("Commit 09: consulta de saldos (DataAccess isolado)", () => {
  it("consulta somente IDs de contas da escola e datas após o saldo inicial", async () => {
    const { dao, queries } = makeDAO();
    const result = await dao.getBalances({ asOf: "2026-07-31" });
    assert.equal(result.totalBalance, 1304.79);
    assert.deepEqual(queries.accounts[0], { schoolId: "school-test" });
    assert.deepEqual(queries.payments[0].accountId.$in, [NOH, INFINITE]);
    assert.deepEqual(queries.payments[0].paidAt, { $gte: "2026-07-01", $lt: "2026-08-01" });
    assert.equal(queries.expenses[0].schoolId, "school-test");
    assert.equal(queries.revenues[0].schoolId, "school-test");
    assert.equal(queries.transfers[0].schoolId, "school-test");
  });
  it("retorna lista vazia sem ler os lançamentos quando não há contas", async () => {
    const { dao, queries } = makeDAO({ accounts: [], payments: [], expenses: [], revenues: [] });
    const result = await dao.getBalances({ asOf: "2026-07-31" });
    assert.equal(result.totalBalance, 0);
    assert.equal(queries.payments.length, 0);
  });
  it("retorna 400 antes de consultar o banco para datas inválidas ou futuras", async () => {
    const { dao, queries } = makeDAO();
    await assert.rejects(dao.getBalances({ asOf: "2027-01-01" }), e => e.statusCode === 400);
    await assert.rejects(dao.getBalances({ asOf: "not-a-date" }), e => e.statusCode === 400);
    assert.equal(queries.accounts.length, 0);
  });
  it("nunca grava nem altera documentos financeiros durante a consulta", async () => {
    const data = fixture();
    const previous = structuredClone(data);
    const { dao } = makeDAO(data);
    await dao.getBalances({ asOf: "2026-07-31" });
    assert.deepEqual(data, previous);
  });
  it("mantém a nova rota antes da rota parametrizada de conta", () => {
    const router = readFileSync(new URL("../../src/modules/financialAccounts/financialAccountsRouter.js", import.meta.url), "utf8");
    assert.ok(router.indexOf('router.get("/balances"') >= 0);
    assert.ok(router.indexOf('router.get("/balances"') < router.indexOf('router.get("/:id"'));
  });
});

/* EN: A transfer changes the distribution of cash, not the business's revenue or expenses.
   PT: Uma transferência altera a distribuição dos saldos, não as receitas e despesas do negócio. */
describe("Commit 11: saldos após transferências", () => {
  const completed = { schoolId: "school-test", fromAccountId: NOH, toAccountId: INFINITE,
    amount: 90, status: "completed", transferredAt: "2026-07-10T12:00:00.000Z" };
  it("debita origem, credita destino e mantém o total consolidado", () => {
    const data = fixture(); data.transfers = [completed];
    const result = calc(data);
    assert.equal(account(result, NOH).balance, 1015.05);
    assert.equal(account(result, INFINITE).balance, 289.74);
    assert.equal(result.totalBalance, 1304.79);
    assert.equal(account(result, NOH).transfersOut, 90);
    assert.equal(account(result, INFINITE).transfersIn, 90);
    assert.equal(account(result, NOH).received, 185.55);
    assert.equal(account(result, NOH).paid, 80.5);
  });
  it("ignora transferências estornadas, futuras ou de contas desconhecidas", () => {
    const data = fixture(); data.transfers = [
      { ...completed, status: "reversed" },
      { ...completed, transferredAt: "2026-08-01T12:00:00.000Z" },
      { ...completed, fromAccountId: "other-id", toAccountId: "foreign-account" }
    ];
    assert.equal(account(calc(data), NOH).balance, 1105.05);
  });
  it("considera a data brasileira do registro UTC para evitar contar a data-base", () => {
    const data = fixture(); data.transfers = [
      { ...completed, amount: 20, transferredAt: "2026-07-01T02:59:00.000Z" },
      { ...completed, amount: 15, transferredAt: "2026-07-01T03:01:00.000Z" }
    ];
    const result = calc(data);
    assert.equal(account(result, NOH).balance, 1090.05);
    assert.equal(account(result, INFINITE).balance, 214.74);
  });
  it("consulta transferências reais da escola na API de saldos", async () => {
    const data = fixture(); data.transfers = [completed];
    const { dao, queries } = makeDAO(data);
    const result = await dao.getBalances({ asOf: "2026-07-31" });
    assert.equal(result.totalBalance, 1304.79);
    assert.equal(result.accounts[0].transfersOut, 90);
    assert.equal(result.accounts[1].transfersIn, 90);
    assert.equal(queries.transfers[0].status, "completed");
    assert.ok(Array.isArray(queries.transfers[0].$or));
  });
  it("consulta saldos em sessão transacional sem aceitar sessão fornecida pelo cliente", async () => {
    const data = fixture(); data.transfers = [completed];
    const { dao } = makeDAO(data);
    const session = { id: "internal" };
    const result = await dao.getBalances({ asOf: "2026-07-31", session: "forged" }, { session });
    assert.equal(result.totalBalance, 1304.79);
  });
});
