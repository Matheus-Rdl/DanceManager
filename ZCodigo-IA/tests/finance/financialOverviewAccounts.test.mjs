import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { buildFinancialAccountsView } from
  "../../src/features/financial/general/financialAccountsView.js";

const source = file => readFile(
  new URL(`../../src/features/financial/general/${file}`, import.meta.url), "utf8"
);

const accounts = [
  { id: "noh", name: "Noh", type: "bank", active: true },
  { id: "infinite", name: "InfinitePay", type: "payment", active: true }
];
const balances = {
  asOf: "2026-11-23", complete: true, totalBalance: 150,
  accounts: [
    { id: "noh", balance: 100, available: true },
    { id: "infinite", balance: 50, available: true }
  ]
};

/* EN: The overview reuses the accounts view model and source components;
       balances are independent from financial-period income/expense totals.
   PT: A Visão Geral reutiliza o modelo e os cards de contas;
       seus saldos não dependem das receitas/despesas do período financeiro. */
describe("Commit 17: cards de saldos na Visão Geral", () => {
  it("reutiliza os cards existentes sem duplicar componentes financeiros", async () => {
    const src = await source("FinancialOverviewAccounts.jsx");
    assert.match(src, /import FinancialAccountCard from "\.\/FinancialAccountCard"/);
    assert.match(src, /import FinancialAccountsSummary from "\.\/FinancialAccountsSummary"/);
    assert.match(src, /buildFinancialAccountsView\(accounts, balances\)/);
    assert.doesNotMatch(src, /8\.740|2\.460|11\.200/);
  });

  it("busca contas e saldos no backend, inclusive após atualizar, sem usar filtro do período", async () => {
    const src = await source("FinancialOverviewAccounts.jsx");
    assert.match(src, /financialAccountsServices\.list\(\{\}, \{ signal: controller\.signal \}\)/);
    assert.match(src, /financialAccountsServices\.getBalances\(\{\}, \{ signal: controller\.signal \}\)/);
    assert.match(src, /\[refreshKey, retryKey\]/);
    assert.match(src, /controller\.abort\(\)/);
    assert.doesNotMatch(src, /periodRange\(|getPeriodSummary\(/);
  });

  it("posiciona dois cards lado a lado e o total imediatamente abaixo", async () => {
    const src = await source("FinancialOverviewAccounts.jsx");
    const grid = src.indexOf("<SimpleGrid");
    const accountCard = src.indexOf("<FinancialAccountCard key=");
    const totalCard = src.indexOf("<FinancialAccountsSummary totalBalance=");
    assert.ok(grid >= 0 && grid < accountCard && accountCard < totalCard);
    assert.match(src, /columns=\{\{ base: 2 \}\}/);
  });

  it("insere os saldos depois dos indicadores principais e antes das mensalidades", async () => {
    const src = await source("FinancialOverview.jsx");
    const mainIndicators = src.indexOf('title="Resultado realizado"');
    const accountSection = src.indexOf("<FinancialOverviewAccounts refreshKey={refreshKey}/>");
    const monthlySection = src.indexOf('title="Mensalidades"');
    assert.ok(mainIndicators !== -1 && mainIndicators < accountSection && accountSection < monthlySection);
  });

  it("não inclui saldo bancário no cálculo do resultado do mês", async () => {
    const src = await source("FinancialOverview.jsx");
    assert.match(src, /const result = Number\(summary\?\.result \|\| 0\)/);
    assert.match(src, /value=\{money\(result\)\}/);
    assert.doesNotMatch(src, /totalBalance\s*[+\-]/);
  });

  it("mostra erro, carregamento, estado vazio e botão de nova tentativa", async () => {
    const src = await source("FinancialOverviewAccounts.jsx");
    assert.match(src, /Carregando saldos das contas/);
    assert.match(src, /role="alert"/);
    assert.match(src, /Tentar novamente/);
    assert.match(src, /Nenhuma conta financeira cadastrada/);
  });

  it("preserva saldo zero e marca valores ausentes como indisponíveis", () => {
    const emptyValue = buildFinancialAccountsView(accounts, {
      ...balances, totalBalance: null, complete: false,
      accounts: [{ id: "noh", balance: 0, available: true }]
    });
    assert.equal(emptyValue.accounts[0].balance, 0);
    assert.equal(emptyValue.accounts[0].available, true);
    assert.equal(emptyValue.accounts[1].balance, null);
    assert.equal(emptyValue.complete, false);
    assert.equal(emptyValue.totalBalance, null);
  });

  it("o total é o valor consolidado informado pelo servidor, sem somar a receita do mês", () => {
    const view = buildFinancialAccountsView(accounts, balances);
    assert.deepEqual(view.accounts.map(account => account.balance), [100, 50]);
    assert.equal(view.totalBalance, 150);
    assert.equal(view.asOf, "2026-11-23");
  });
});
