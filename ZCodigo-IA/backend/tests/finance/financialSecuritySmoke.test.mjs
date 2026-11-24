import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { financialAccountsAccessGate } from "../../src/modules/financialAccounts/financialAccountsAccess.js";
import { calculateFinancialAccountBalances } from "../../src/modules/financialAccounts/financialAccountsBalanceRules.js";
import { buildFinancialMovements } from "../../src/modules/financial/financialMovements.js";

/* EN: Exercise actual production guards without HTTP packages or a running MongoDB.
   PT: Valida as proteções de produção sem dependências HTTP nem MongoDB ativo. */
describe("Commit 20: proteção das contas financeiras", () => {
  it("bloqueia leituras e gravações de contas em produção sem autenticação", () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      let nextCalls = 0;
      const response = { statusCode: 0, body: null,
        status(code) { this.statusCode = code; return this; },
        send(body) { this.body = body; return this; } };
      const result = financialAccountsAccessGate({}, response, () => { nextCalls++; });
      assert.equal(result.statusCode, 403);
      assert.equal(result.body.success, false);
      assert.equal(nextCalls, 0);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
  it("permite desenvolvimento local sem alterar a regra de produção", () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "test";
      let nextCalls = 0;
      financialAccountsAccessGate({}, {}, () => { nextCalls++; });
      assert.equal(nextCalls, 1);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
  it("instala o middleware antes de TODAS as rotas de consulta e escrita", () => {
    const source = readFileSync(new URL("../../src/modules/financialAccounts/financialAccountsRouter.js", import.meta.url), "utf8");
    assert.match(source, /router\.use\(financialAccountsAccessGate\)/);
    for (const method of ['router.get("/balances"', 'router.get("/"', 'router.get("/:id"', 'router.post("/"', 'router.patch("/:id"']) {
      assert.ok(source.indexOf("router.use(financialAccountsAccessGate)") < source.indexOf(method), method);
    }
  });
});

/* EN: A cross-module fixture verifies that account-filtered statements reconcile with
       settled account balances; transfers change location, never operating revenue.
   PT: Cenário integrado confere extratos filtrados e saldos efetivos; transferências
       mudam a localização do dinheiro, não o resultado operacional. */
describe("Commit 20: regressão financeira de ponta a ponta (regras puras)", () => {
  const noh = "11111111-1111-4111-8111-111111111111";
  const infinite = "22222222-2222-4222-8222-222222222222";
  const accounts = [
    { id: noh, name: "Noh", initialBalance: 0, balanceDate: "2026-06-30", active: true },
    { id: infinite, name: "InfinitePay", initialBalance: 0, balanceDate: "2026-06-30", active: true }
  ];
  const payments = [
    { id: "p1", monthlyFeeId: "fee-1", userId: "u1", accountId: noh, amount: 70, paidAt: "2026-07-02", status: "confirmed", method: "pix" },
    { id: "p2", monthlyFeeId: "fee-1", userId: "u1", accountId: infinite, amount: 30, paidAt: "2026-07-03", status: "confirmed", method: "cartao" },
    { id: "p3", monthlyFeeId: "fee-2", userId: "u1", accountId: noh, amount: 9, paidAt: "2026-07-04", status: "reversed", method: "pix" },
    { id: "p4", monthlyFeeId: "fee-3", userId: "u1", accountId: noh, amount: 99, paidAt: "2026-06-30", status: "confirmed", method: "pix" }
  ];
  const expenses = [
    { id: "e1", accountId: noh, status: "paid", paidAmount: 20, paidAt: "2026-07-04", method: "pix" },
    { id: "e2", accountId: infinite, status: "paid", paidAmount: 15, paidAt: "2026-07-04", method: "pix" }
  ];
  const revenues = [
    { id: "r1", accountId: noh, status: "received", receivedAmount: 50, receivedAt: "2026-07-04", method: "pix" },
    { id: "r2", accountId: infinite, status: "received", receivedAmount: 5, receivedAt: "2026-07-04", method: "pix" }
  ];
  const transfers = [
    { id: "t1", fromAccountId: noh, toAccountId: infinite, amount: 25, status: "completed", transferredAt: "2026-07-05T12:00:00.000Z" },
    { id: "t2", fromAccountId: infinite, toAccountId: noh, amount: 10, status: "reversed", transferredAt: "2026-07-06T12:00:00.000Z", reversedAt: "2026-07-08T12:00:00.000Z" }
  ];
  const report = asOf => calculateFinancialAccountBalances({ accounts, payments, expenses, revenues, transfers }, asOf);
  it("reconcilia mensalidades parciais, proventos e despesas sem contar estornos e data-base", () => {
    const final = report("2026-07-31");
    assert.equal(final.totalBalance, 120);
    assert.equal(final.accounts.find(a => a.id === noh).balance, 75);
    assert.equal(final.accounts.find(a => a.id === infinite).balance, 45);
    assert.equal(final.accounts.reduce((sum, account) => sum + account.received - account.paid, 0), 120);
  });
  it("não muda o total durante transferência nem reescreve saldo passado após o estorno", () => {
    const beforeReverse = report("2026-07-07");
    const afterReverse = report("2026-07-08");
    assert.equal(beforeReverse.totalBalance, 120);
    assert.equal(afterReverse.totalBalance, 120);
    assert.equal(beforeReverse.accounts.find(a => a.id === noh).balance, 85);
    assert.equal(afterReverse.accounts.find(a => a.id === noh).balance, 75);
  });
  it("mantém cada parcela de mensalidade apenas na conta filtrada", () => {
    const source = { payments: payments.filter(p => p.paidAt >= "2026-07-01"), fees: [{ id: "fee-1", reference: "2026-07" }],
      users: [], expenses, revenues };
    const nohExtract = buildFinancialMovements(source, {}, { accountId: noh });
    const infiniteExtract = buildFinancialMovements(source, {}, { accountId: infinite });
    assert.equal(nohExtract.totals.received, 120);
    assert.equal(nohExtract.totals.paid, 20);
    assert.equal(infiniteExtract.totals.received, 35);
    assert.equal(infiniteExtract.totals.paid, 15);
    assert.equal(nohExtract.rows.find(r => r.id === "monthlyFee:fee-1").details.length, 1);
    assert.equal(infiniteExtract.rows.find(r => r.id === "monthlyFee:fee-1").details.length, 1);
  });
});
