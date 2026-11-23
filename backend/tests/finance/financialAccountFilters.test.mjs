import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { accountMatchForSchool, validateFinancialAccountId } from "../../src/modules/financial/financialAccountFilterRules.js";
import { buildFinancialMovements } from "../../src/modules/financial/financialMovements.js";

const read = name => readFile(new URL(`../../src/modules/financial/${name}`, import.meta.url), "utf8");
const mixed = () => ({
  fees: [{ id: "fee1", reference: "2026-11" }],
  payments: [
    { id: "p1", monthlyFeeId: "fee1", accountId: "noh", amount: 100, paidAt: "2026-11-05", method: "pix" },
    { id: "p2", monthlyFeeId: "fee1", accountId: "infinite", amount: 70, paidAt: "2026-11-08", method: "credit" },
    { id: "p3", monthlyFeeId: "fee1", amount: 20, paidAt: "2026-11-09", method: "pix" },
    { id: "p4", monthlyFeeId: "fee1", accountId: "noh", amount: 200, paidAt: "2026-11-10", status: "reversed" }
  ],
  expenses: [
    { id: "e1", accountId: "noh", status: "paid", paidAmount: 30, paidAt: "2026-11-04" },
    { id: "e2", accountId: "infinite", status: "paid", paidAmount: 20, paidAt: "2026-11-06" },
    { id: "e3", accountId: "infinite", status: "pending", paidAmount: 999, paidAt: "2026-11-07" }
  ],
  revenues: [
    { id: "r1", accountId: "noh", status: "received", receivedAmount: 25, receivedAt: "2026-11-02" },
    { id: "r2", accountId: "infinite", status: "received", receivedAmount: 90, receivedAt: "2026-11-02" }
  ]
});

/* EN: The default view must preserve legacy records; account-specific views exclude them.
   PT: O consolidado preserva registros legados; o filtro por conta não os atribui arbitrariamente. */
describe("Commit 18: extrato agrupado por conta", () => {
  it("preserva o consolidado ao selecionar todas as contas", () => {
    const result = buildFinancialMovements(mixed());
    assert.equal(result.rows.find(r => r.id === "monthlyFee:fee1").amount, 190);
    assert.equal(result.rows.find(r => r.id === "monthlyFee:fee1").details.length, 3);
    assert.deepEqual(result.totals, { received: 305, paid: 50, balance: 255, count: 5 });
  });
  it("filtra parcelas da Noh antes de agrupar e preserva seus detalhes", () => {
    const result = buildFinancialMovements(mixed(), {}, { accountId: "noh" });
    const fee = result.rows.find(r => r.origin === "monthlyFee");
    assert.equal(fee.amount, 100);
    assert.deepEqual(fee.details.map(d => d.id), ["p1"]);
    assert.equal(fee.details[0].accountId, "noh");
    assert.equal(fee.accountId, "noh");
    assert.deepEqual(result.totals, { received: 125, paid: 30, balance: 95, count: 3 });
  });
  it("filtra InfinitePay com entrada, despesa e mensalidade corretas", () => {
    const result = buildFinancialMovements(mixed(), {}, { accountId: "infinite" });
    assert.equal(result.rows.find(r => r.origin === "monthlyFee").amount, 70);
    assert.deepEqual(result.totals, { received: 160, paid: 20, balance: 140, count: 3 });
  });
  it("não associa lançamentos legados sem accountId à conta selecionada", () => {
    const rows = buildFinancialMovements(mixed(), {}, { accountId: "noh" }).rows;
    assert.ok(rows.flatMap(r => r.details).every(d => d.accountId === "noh"));
  });
  it("não altera os documentos originais", () => {
    const records = mixed(); const before = structuredClone(records);
    buildFinancialMovements(records, {}, { accountId: "infinite" });
    assert.deepEqual(records, before);
  });
  it("mantém o agrupamento de uma mensalidade compartilhada quando não há filtro", () => {
    const fee = buildFinancialMovements(mixed()).rows.find(r => r.origin === "monthlyFee");
    assert.equal(fee.accountId, null);
    assert.deepEqual(fee.accountIds.sort(), ["infinite", "noh"]);
  });
});

/* EN: Account ID must resolve to this school's account, including inactive historical accounts.
   PT: O ID deve pertencer à escola, inclusive quando a conta histórica está inativa. */
describe("Commit 18: proteção e validação da conta no servidor", () => {
  it("não aplica filtro em Todas", () => {
    assert.equal(validateFinancialAccountId(""), "");
    assert.equal(validateFinancialAccountId(undefined), "");
  });
  it("rejeita identificadores inválidos", () => {
    for (const value of [123, "noh;drop", " noh ", { id: "noh" }, "x".repeat(129)]) {
      assert.throws(() => validateFinancialAccountId(value), err => err.statusCode === 400);
    }
  });
  it("não executa consulta quando o filtro é vazio", async () => {
    const accountModel = { findOne() { throw new Error("não deveria consultar"); } };
    assert.deepEqual(await accountMatchForSchool("", { accountModel, getSchoolId: () => "default" }), {});
  });
  it("vincula o identificador da escola no filtro e aceita conta inativa", async () => {
    let query;
    const accountModel = { findOne(q) { query = q; return { select() { return { lean: async () => ({ id: "noh", active: false }) }; } }; } };
    assert.deepEqual(await accountMatchForSchool("noh", { accountModel, getSchoolId: () => "default" }), { accountId: "noh" });
    assert.deepEqual(query, { id: "noh", schoolId: "default" });
  });
  it("não retorna conta de outra escola", async () => {
    const accountModel = { findOne() { return { select() { return { lean: async () => null }; } }; } };
    await assert.rejects(() => accountMatchForSchool("noh", { accountModel, getSchoolId: () => "default" }),
      err => err.statusCode === 404);
  });
});

describe("Commit 18: consultas realizadas no backend", () => {
  it("aplica accountMatch às agregações de mensalidades, despesas e proventos", async () => {
    const src = await read("financialDataAccess.js");
    assert.match(src, /Payment\.aggregate\(\[\s*\{ \$match: \{ \.\.\.activePayments, \.\.\.accountMatch/);
    assert.match(src, /Expense\.aggregate\(\[\s*\{ \$match: \{ schoolId: schoolId\(\), status: "paid", \.\.\.accountMatch/);
    assert.match(src, /Revenue\.aggregate\(\[\s*\{ \$match: \{ schoolId: schoolId\(\), status: "received", \.\.\.accountMatch/);
  });
  it("filtra top despesas por conta e não filtra cobranças em aberto", async () => {
    const src = await read("financialDataAccess.js");
    assert.match(src, /Expense\.find\(\{ schoolId: schoolId\(\), status: "paid", \.\.\.accountMatch, paidAmount/);
    assert.match(src, /MonthlyFee\.find\(\{ reference: \{ \$gte: from, \$lte: to \}, status:/);
    assert.match(src, /Revenue\.find\(\{ schoolId: schoolId\(\), reference: \{ \$gte: from, \$lte: to \}, status: "pending" \}/);
  });
  it("seleciona accountId em parcelas, despesas e proventos do extrato", async () => {
    const src = await read("financialDataAccess.js");
    assert.match(src, /paidAt createdAt method accountId/);
    assert.match(src, /status paidAt paidAmount method createdAt accountId/);
    assert.match(src, /status receivedAt receivedAmount method createdAt accountId/);
    assert.match(src, /buildFinancialMovements\(\{ payments, fees, users, expenses, revenues \}, period, accountMatch\)/);
  });
  it("não introduz transferências como receitas ou despesas", async () => {
    const src = await read("financialDataAccess.js");
    assert.doesNotMatch(src, /FinancialTransfer\.aggregate/);
  });
});
