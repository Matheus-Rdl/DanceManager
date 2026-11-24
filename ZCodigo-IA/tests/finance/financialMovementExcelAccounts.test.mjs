import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import {
  filterFinancialMovementRows,
  getFinancialMovementExportRows
} from "../../src/services/reports/financial/financialMovementRows.js";

const accounts = [
  { id: "acc-noh", name: "Noh", active: true },
  { id: "acc-ip", name: "InfinitePay", active: true },
  { id: "acc-old", name: "Conta antiga", active: false }
];
const payment = (id, date, amount, method, accountId) => ({ id, date, amount, method, accountId });
const fee = {
  id: "monthlyFee:fee-1", sourceId: "fee-1", origin: "monthlyFee", direction: "in",
  description: "Mensalidade — Aluna A", category: "Mensalidades", date: "2026-07-14",
  responsible: null, amount: 270, accountId: null,
  details: [
    payment("p1", "2026-07-10", 100, "pix", "acc-noh"),
    payment("p2", "2026-07-14", 170, "credit", "acc-ip")
  ]
};
const expense = {
  id: "expense:e1", origin: "expense", direction: "out", description: "Aluguel",
  category: "Aluguel", amount: 90, date: "2026-07-20", responsible: { name: "Pety" },
  accountId: "acc-noh", details: [payment("e1", "2026-07-20", 90, "pix", "acc-noh")]
};
const revenue = {
  id: "revenue:r1", origin: "revenue", direction: "in", description: "Venda",
  category: "Vendas", amount: 75, date: "2026-07-05", responsible: { name: "Vanessa" },
  accountId: "acc-ip", details: [payment("r1", "2026-07-05", 75, "debit", "acc-ip")]
};
const exportRows = (...rows) => getFinancialMovementExportRows(rows, { accounts });
const readSource = file => readFile(new URL(`../../src/${file}`, import.meta.url), "utf8");

/* EN: Validate names and immutable account IDs per actual settlement, not per grouped fee.
   PT: Valida nome e ID de cada parcela real, sem presumir a conta da mensalidade agrupada. */
describe("Commit 19: contas por linha na exportação", () => {
  it("separa mensalidade mista em duas linhas e preserva as contas distintas", () => {
    const rows = exportRows(fee);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(({ accountName, accountId }) => ({ accountName, accountId })), [
      { accountName: "InfinitePay", accountId: "acc-ip" },
      { accountName: "Noh", accountId: "acc-noh" }
    ]);
    assert.deepEqual(rows.map(row => row.amount), [170, 100]);
  });

  it("usa a conta de cada liquidação em despesas e proventos", () => {
    const rows = exportRows(expense, revenue);
    const byType = Object.fromEntries(rows.map(row => [row.type, row]));
    assert.equal(byType.Saída.accountName, "Noh");
    assert.equal(byType.Saída.amount, -90);
    assert.equal(byType.Entrada.accountName, "InfinitePay");
    assert.equal(byType.Entrada.amount, 75);
  });

  it("não perde os rótulos de contas desativadas no histórico", () => {
    const rows = exportRows({ ...expense, details: [payment("old", "2026-07-20", 12, "pix", "acc-old")] });
    assert.equal(rows[0].accountName, "Conta antiga");
    assert.equal(rows[0].accountId, "acc-old");
  });

  it("não atribui automaticamente a Noh a registros sem conta", () => {
    const rows = exportRows({ ...fee, details: [payment("legacy", "2026-07-01", 50, "pix", null)] });
    assert.equal(rows[0].accountName, "Não identificada");
    assert.equal(rows[0].accountId, "");
  });

  it("preserva o ID mesmo quando a conta não foi encontrada no cadastro", () => {
    const rows = exportRows({ ...fee, details: [payment("unknown", "2026-07-01", 50, "pix", "acc-unknown")] });
    assert.equal(rows[0].accountName, "Conta não localizada");
    assert.equal(rows[0].accountId, "acc-unknown");
  });

  it("não transfere um accountId agrupado para parcela sem identificação", () => {
    const rows = exportRows({ ...fee, accountId: "acc-noh", details: [payment("p3", "2026-07-01", 50, "pix", undefined)] });
    assert.equal(rows[0].accountName, "Não identificada");
  });

  it("suporta lançamentos legados sem details usando o accountId original", () => {
    const { accountName, accountId } = exportRows({ ...expense, details: [] })[0];
    assert.equal(accountName, "Noh");
    assert.equal(accountId, "acc-noh");
  });

  it("preserva as colunas anteriores e o valor numérico assinado", () => {
    const row = exportRows(expense)[0];
    assert.deepEqual(Object.keys(row), [
      "date", "initiator", "method", "origin", "category", "description", "amount", "type", "accountName", "accountId"
    ]);
    assert.equal(typeof row.amount, "number");
    assert.equal(row.initiator, "Pety");
  });

  it("aplica filtro por forma de pagamento antes de separar parcelas", () => {
    const filtered = filterFinancialMovementRows([fee], { method: "pix" });
    const rows = getFinancialMovementExportRows(filtered, { accounts });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].accountName, "Noh");
    assert.equal(rows[0].amount, 100);
  });

  it("não fixa Noh ou InfinitePay no mapeamento", () => {
    const rows = getFinancialMovementExportRows([expense], { accounts: [{ id: "acc-noh", name: "Nome personalizado" }] });
    assert.equal(rows[0].accountName, "Nome personalizado");
  });
});

describe("Commit 19: integração da exportação", () => {
  it("busca contas e movimentações atualizadas e valida ambas as respostas", async () => {
    const src = await readSource("features/financial/general/FinancialMovements.jsx");
    assert.match(src, /financialAccountsServices\.list\(\)/);
    assert.match(src, /financialServices\.getMovements\(\{ from, to, startDate, endDate, accountId \}\)/);
    assert.match(src, /if \(!Array\.isArray\(accounts\)\) throw/);
    assert.match(src, /generateExcelMovements\(\{ movements: visible, accounts, from: fromDate, to: toDate \}\)/);
    assert.match(src, /filterFinancialMovementRows\(result\.rows, \{ search, origin, responsible, method \}\)/);
  });

  it("mantém as oito colunas antigas e acrescenta conta e identificador", async () => {
    const src = await readSource("services/reports/financial/excelMovements.js");
    assert.deepEqual([...src.matchAll(/header:\s*"([^"]+)"/g)].map(match => match[1]), [
      "Data", "Iniciador", "Método", "Origem", "Categoria", "Descrição", "Valor", "Tipo", "Conta financeira", "ID da conta"
    ]);
    assert.match(src, /getFinancialMovementExportRows\(movements, \{ accounts \}\)/);
    assert.match(src, /to: `J\$\{Math\.max\(2, rows\.length \+ 1\)\}`/);
    assert.match(src, /getColumn\("amount"\)\.numFmt/);
    assert.match(src, /getColumn\("date"\)\.numFmt/);
  });
});
