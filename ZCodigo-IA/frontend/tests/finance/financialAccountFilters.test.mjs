import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

const view = async file => readFile(new URL(`../../src/features/financial/general/${file}`, import.meta.url), "utf8");

/* EN: Confirm that the selected account scopes cash-flow requests but never the bank balance cards.
   PT: Confere que a conta filtra o caixa, sem filtrar os saldos bancários consolidados. */
describe("Commit 18: seletor compartilhado entre Visão Geral e Movimentações", () => {
  it("consulta as contas dinamicamente sem fixar Noh e InfinitePay", async () => {
    const src = await view("FinancialAccountFilter.jsx");
    assert.match(src, /financialAccountsServices\.list\(\{\}, \{ signal: controller\.signal \}\)/);
    assert.match(src, /accounts\.map\(account =>/);
    assert.match(src, /<option value="">Todas as contas<\/option>/);
    assert.doesNotMatch(src, /<option[^>]*>Noh<\/option>/);
    assert.doesNotMatch(src, /<option[^>]*>InfinitePay<\/option>/);
  });
  it("permite contas inativas para histórico e mostra erro sem ocultá-lo", async () => {
    const src = await view("FinancialAccountFilter.jsx");
    assert.match(src, /account\.active === false/);
    assert.match(src, /role="alert"/);
    assert.match(src, /Tentar novamente/);
  });
  it("mantém um único accountId para overview e movements", async () => {
    const src = await view("FinancialGeneral.jsx");
    assert.match(src, /\[accountId, setAccountId\] = useState\(""\)/);
    assert.match(src, /<FinancialAccountFilter value=\{accountId\} onChange=\{setAccountId\}/);
    assert.match(src, /tab === "overview" \|\| tab === "movements" \|\| tab === "evolution"/);
    assert.match(src, /<FinancialOverview[^>]*accountId=\{accountId\}/);
    assert.match(src, /<FinancialMovements[^>]*accountId=\{accountId\}/);
  });
});

describe("Commit 18: Visão Geral filtrada corretamente", () => {
  it("consulta o resumo atual e anterior da mesma conta", async () => {
    const src = await view("FinancialOverview.jsx");
    assert.match(src, /getPeriodSummary\(\{ from, to, accountId \}\)/);
    assert.match(src, /getPeriodSummary\(\{ \.\.\.oldRange, accountId \}\)/);
    assert.match(src, /\[from, to, accountId, refreshKey, retry\]/);
  });
  it("preserva saldos consolidados sem passar accountId aos cards", async () => {
    const src = await view("FinancialOverview.jsx");
    assert.match(src, /<FinancialOverviewAccounts refreshKey=\{refreshKey\}\/>/);
    assert.doesNotMatch(src, /<FinancialOverviewAccounts[^>]*accountId=/);
  });
  it("mantém indicadores de cobrança pendente no resumo geral", async () => {
    const src = await view("FinancialOverview.jsx");
    assert.match(src, /title="Previstas"/);
    assert.match(src, /title="Em atraso"/);
    assert.match(src, /title="Em aberto"/);
    assert.match(src, /permanecem gerais/);
  });
  it("filtra evolução resumida, detalhes mensais e evolução completa", async () => {
    const src = await view("FinancialOverviewMiniTimeline.jsx");
    assert.match(src, /getTimeline\(\{ mode: queryMode, month: queryMonth, year: period\.year, accountId \}\)/);
    assert.match(src, /getMovements\(\{ from: selectedMonth, to: selectedMonth, accountId \}\)/);
    assert.match(await view("FinancialTimelineChart.jsx"), /year: selectedYear, accountId/);
  });
});

describe("Commit 18: Movimentações e exportação", () => {
  it("filtra via API, não tenta alterar registros client-side", async () => {
    const src = await view("FinancialMovements.jsx");
    assert.match(src, /financialServices\.getMovements\(\{ from, to, startDate, endDate, accountId \}\)/);
    assert.match(src, /\[from, to, startDate, endDate, accountId, refreshKey, retry\]/);
  });
  it("aplica accountId também na nova consulta usada pela exportação", async () => {
    const src = await view("FinancialMovements.jsx");
    assert.equal((src.match(/getMovements\(\{ from, to, startDate, endDate, accountId \}\)/g) || []).length, 2);
    assert.match(src, /filterFinancialMovementRows\(result\.rows, \{ search, origin, responsible, method \}\)/);
  });
  it("calcula os totais apenas das linhas filtradas recebidas da API", async () => {
    const src = await view("FinancialMovements.jsx");
    assert.match(src, /const totalReceived = filtered\.reduce/);
    assert.match(src, /const totalPaid = filtered\.reduce/);
  });
});
