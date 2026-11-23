import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { buildFinancialAccountsView, financialAccountMoney, financialAccountTypeLabel } from
  "../../src/features/financial/general/financialAccountsView.js";

const registrations = [
  { id: "noh-123", name: "Noh", type: "bank", active: true, isDefault: true },
  { id: "inf-456", name: "InfinitePay", type: "payment", active: true, isDefault: false }
];
const report = {
  asOf: "2026-11-22", complete: true, totalBalance: 1304.79,
  accounts: [
    { id: "inf-456", balance: 199.74, available: true },
    { id: "noh-123", balance: 1105.05, available: true }
  ]
};
const sourceFile = name => readFile(new URL(`../../src/features/financial/general/${name}`, import.meta.url), "utf8");

/* EN: UI data mapping tests use the real balance API schema, without inventing currentBalance.
   PT: Os testes usam o formato real da API de saldos, sem inventar currentBalance. */
describe("Commit 14: saldos por conta no frontend", () => {
  it("associa saldos pelo ID, independentemente da ordem retornada", () => {
    const view = buildFinancialAccountsView(registrations, report);
    assert.deepEqual(view.accounts.map(a => [a.name, a.balance]),
      [["Noh", 1105.05], ["InfinitePay", 199.74]]);
    assert.equal(view.asOf, "2026-11-22");
    assert.equal(view.totalBalance, 1304.79);
    assert.equal(view.complete, true);
  });

  it("preserva valores reais zerados sem confundi-los com ausência de saldo", () => {
    const view = buildFinancialAccountsView(registrations, {
      ...report, totalBalance: 0,
      accounts: report.accounts.map(a => ({ ...a, balance: 0 }))
    });
    assert.equal(view.accounts[0].available, true);
    assert.equal(view.accounts[0].balance, 0);
    assert.equal(financialAccountMoney(0), "R$ 0,00");
  });

  it("não inventa R$ 0 quando a conta ou o cálculo não foi retornado", () => {
    const view = buildFinancialAccountsView(registrations, {
      ...report, accounts: [report.accounts[0]]
    });
    assert.equal(view.accounts[0].balance, null);
    assert.equal(view.accounts[0].available, false);
    assert.equal(view.totalBalance, null);
    assert.equal(view.complete, false);
    assert.equal(financialAccountMoney(null), "—");
  });

  it("não exibe um total como completo quando o backend indica cálculo parcial", () => {
    const view = buildFinancialAccountsView(registrations, {
      ...report, complete: false, totalBalance: null,
      accounts: [{ id: "noh-123", balance: 1105.05, available: true },
        { id: "inf-456", balance: null, available: false }]
    });
    assert.equal(view.accounts[0].available, true);
    assert.equal(view.accounts[1].available, false);
    assert.equal(view.totalBalance, null);
  });

  it("mantém contas inativas na apresentação e no total retornado pela API", () => {
    const view = buildFinancialAccountsView(
      [registrations[0], { ...registrations[1], active: false }], report);
    assert.equal(view.accounts[1].active, false);
    assert.equal(view.accounts[1].balance, 199.74);
    assert.equal(view.totalBalance, 1304.79);
  });

  it("suporta novas contas sem cadastrar nomes fixos no frontend", () => {
    const view = buildFinancialAccountsView(
      [...registrations, { id: "cash-789", name: "Caixa", type: "cash", active: true }],
      { ...report, totalBalance: 1354.79, accounts: [
        ...report.accounts, { id: "cash-789", balance: 50, available: true }
      ] }
    );
    assert.equal(view.accounts.length, 3);
    assert.equal(view.accounts[2].name, "Caixa");
    assert.equal(view.totalBalance, 1354.79);
  });

  it("mantém saldos negativos (não arredonda para zero)", () => {
    const view = buildFinancialAccountsView(registrations, {
      ...report, totalBalance: -100,
      accounts: [{ id: "noh-123", balance: -100, available: true },
        { id: "inf-456", balance: 0, available: true }]
    });
    assert.equal(view.accounts[0].balance, -100);
    assert.equal(view.totalBalance, -100);
    assert.match(financialAccountMoney(-100), /100,00/);
  });

  it("rejeita resposta de API inesperada, em vez de mostrar uma conta vazia", () => {
    assert.throws(() => buildFinancialAccountsView(registrations, {}), /Resposta inesperada/);
    assert.throws(() => buildFinancialAccountsView({}, report), /Resposta inesperada/);
  });

  it("respeita as classificações existentes e oferece fallback administrativo", () => {
    assert.equal(financialAccountTypeLabel("bank"), "Conta bancária");
    assert.equal(financialAccountTypeLabel("payment"), "Conta de pagamento");
    assert.equal(financialAccountTypeLabel("cash"), "Dinheiro físico");
    assert.equal(financialAccountTypeLabel("other"), "Conta financeira");
  });

  it("diferencia valores ausentes de valores financeiros válidos", () => {
    for (const missing of [undefined, null, "", Number.NaN, Infinity, -Infinity]) {
      assert.equal(financialAccountMoney(missing), "—");
    }
    assert.match(financialAccountMoney(35.55), /35,55/);
  });
});

describe("Commit 14: integração e disposição visual", () => {
  it("consulta o cadastro e o saldo na API real, mantendo abort e atualização", async () => {
    const src = await sourceFile("FinancialAccounts.jsx");
    assert.match(src, /financialAccountsServices\.list\(/);
    assert.match(src, /financialAccountsServices\.getBalances\(/);
    assert.match(src, /Promise\.all\(/);
    assert.match(src, /controller\.abort\(\)/);
    assert.match(src, /setRetryKey\(/);
  });

  it("mostra dois cards por linha e o total logo abaixo", async () => {
    const src = await sourceFile("FinancialAccounts.jsx");
    const grid = src.indexOf("<SimpleGrid");
    const card = src.indexOf("<FinancialAccountCard");
    const summary = src.indexOf("<FinancialAccountsSummary");
    assert.ok(grid >= 0 && card > grid && summary > card);
    assert.match(src, /columns=\{\{ base: 2 \}\}/);
    assert.match(src, /view\.accounts\.map\(/);
  });

  it("integra o Dialog de transferência sem inserir saldos de exemplo", async () => {
    const src = await sourceFile("FinancialAccounts.jsx");
    assert.match(src, /import TransferDialog from "\.\/TransferDialog"/);
    assert.match(src, /<TransferDialog open=\{transferOpen\}/);
    assert.doesNotMatch(src, /8\.740|2\.460|11\.200/);
  });

  it("o resumo não soma o saldo das contas no cliente nem ignora respostas incompletas", async () => {
    const src = await sourceFile("FinancialAccountsSummary.jsx");
    assert.match(src, /financialAccountMoney\(complete \? totalBalance : null\)/);
    assert.match(src, /inclusive inativas/);
    assert.doesNotMatch(src, /\.reduce\(/);
  });
});
