import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import financialAccountsServices from "../../src/services/financialAccountsServices.js";
import financialTransfersServices from "../../src/services/financialTransfersServices.js";

/* EN: No backend or external libraries: intercept fetch to verify the exact API contract.
   PT: Sem backend ou bibliotecas externas: intercepta fetch e confere o contrato HTTP real. */
async function interceptFetch(payload, run, { ok = true, status = 200 } = {}) {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok, status, json: async () => payload };
  };
  try {
    const result = await run(calls);
    return { calls, result };
  } finally {
    globalThis.fetch = previous;
  }
}

describe("Financeiro: services de contas", () => {
  it("consulta as contas na rota real e desempacota body", async () => {
    const accounts = [{ id: "noh", name: "Noh" }, { id: "infinite", name: "InfinitePay" }];
    const { calls, result } = await interceptFetch({ success: true, body: accounts },
      () => financialAccountsServices.list());
    assert.deepEqual(result, accounts);
    assert.equal(calls[0].url, "/financial-accounts");
    assert.equal(calls[0].options.method, "GET");
  });

  it("preserva booleanos na query e ignora valores vazios", async () => {
    const { calls } = await interceptFetch({ success: true, body: [] },
      () => financialAccountsServices.list({ active: false, unused: undefined, other: "" }));
    assert.equal(calls[0].url, "/financial-accounts?active=false");
  });

  it("consulta saldo com a data-base no parâmetro asOf", async () => {
    const sample = { asOf: "2026-07-31", accounts: [], totalBalance: 0, complete: true };
    const { calls, result } = await interceptFetch({ success: true, body: sample },
      () => financialAccountsServices.getBalances({ asOf: "2026-07-31" }));
    assert.deepEqual(result, sample);
    assert.equal(calls[0].url, "/financial-accounts/balances?asOf=2026-07-31");
  });

  it("consulta detalhe pelo ID sem permitir barra de caminho", async () => {
    const { calls } = await interceptFetch({ success: true, body: { name: "Noh" } },
      () => financialAccountsServices.get("id/unsafe"));
    assert.equal(calls[0].url, "/financial-accounts/id%2Funsafe");
  });

  it("usa POST na criação e envia JSON", async () => {
    const input = { name: "Noh", type: "bank", initialBalance: 0, balanceDate: "2026-06-30" };
    const { calls } = await interceptFetch({ success: true, body: { id: "noh" } },
      () => financialAccountsServices.create(input));
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), input);
    assert.equal(calls[0].options.headers["Content-Type"], "application/json");
  });

  it("usa PATCH para campos administrativos", async () => {
    const { calls } = await interceptFetch({ success: true, body: { active: false } },
      () => financialAccountsServices.update("noh", { active: false }));
    assert.equal(calls[0].url, "/financial-accounts/noh");
    assert.equal(calls[0].options.method, "PATCH");
    assert.deepEqual(JSON.parse(calls[0].options.body), { active: false });
  });

  it("propaga falhas de validação da API", async () => {
    await interceptFetch({ success: false, statusCode: 400, body: "Conta inexistente." },
      async () => assert.rejects(financialAccountsServices.get("foo"), /Conta inexistente/),
      { ok: false, status: 400 });
  });

  it("rejeita respostas que não são JSON", async () => {
    const previous = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError("não JSON"); } });
    try {
      await assert.rejects(financialAccountsServices.list(), /Resposta inválida/);
    } finally { globalThis.fetch = previous; }
  });

  it("repassa AbortSignal para interromper consultas obsoletas", async () => {
    const controller = new AbortController();
    const { calls } = await interceptFetch({ success: true, body: [] },
      () => financialAccountsServices.list({}, { signal: controller.signal }));
    assert.equal(calls[0].options.signal, controller.signal);
  });
});

describe("Financeiro: services de transferências", () => {
  it("consulta histórico paginado e filtros com a rota definida no backend", async () => {
    const page = { items: [], total: 0, page: 2, limit: 10 };
    const { calls, result } = await interceptFetch({ success: true, body: page },
      () => financialTransfersServices.list({ accountId: "noh", status: "completed", page: 2, limit: 10 }));
    assert.deepEqual(result, page);
    assert.equal(calls[0].url, "/financial-transfers?accountId=noh&status=completed&page=2&limit=10");
  });

  it("consulta transferência individual", async () => {
    const { calls } = await interceptFetch({ success: true, body: { id: "t1" } },
      () => financialTransfersServices.get("t1"));
    assert.equal(calls[0].url, "/financial-transfers/t1");
  });

  it("envia as duas contas e a chave de idempotência sem inventar campos", async () => {
    const request = {
      fromAccountId: "noh", toAccountId: "infinite", amount: 200,
      initiatorKey: "pety", idempotencyKey: "operation_000123", note: "Teste"
    };
    const { calls } = await interceptFetch({ success: true, body: { id: "t1" } },
      () => financialTransfersServices.create(request));
    assert.equal(calls[0].url, "/financial-transfers");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), request);
  });

  it("usa endpoint correto para estorno, enviando razão e responsável", async () => {
    const { calls } = await interceptFetch({ success: true, body: { status: "reversed" } },
      () => financialTransfersServices.reverse("t1", { reason: "Registro incorreto", initiatorKey: "vanessa" }));
    assert.equal(calls[0].url, "/financial-transfers/t1/reverse");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), { reason: "Registro incorreto", initiatorKey: "vanessa" });
  });

  it("expõe o bloqueio 403 de produção sem fingir sucesso", async () => {
    await interceptFetch({ success: false, body: "Transferências indisponíveis em produção sem autenticação e autorização." },
      async () => assert.rejects(financialTransfersServices.create({}), /indisponíveis em produção/),
      { ok: false, status: 403 });
  });
});

describe("Financeiro: integração da aba Contas", () => {
  it("preserva as seis abas existentes e adiciona Contas", async () => {
    const source = await readFile(new URL("../../src/features/financial/general/FinancialGeneral.jsx", import.meta.url), "utf8");
    for (const id of ["overview", "receipts", "revenues", "expenses", "movements", "evolution", "accounts"]) {
      assert.match(source, new RegExp(`id:\\"${id}\\"`));
    }
    assert.match(source, /import FinancialAccounts from "\.\/FinancialAccounts"/);
    assert.match(source, /tab==="accounts" && <FinancialAccounts refreshKey=\{refreshKey\}/);
  });

  it("esconde o filtro de competência na aba Contas e preserva nas demais", async () => {
    const source = await readFile(new URL("../../src/features/financial/general/FinancialGeneral.jsx", import.meta.url), "utf8");
    assert.match(source, /tab !== "accounts" && <FinancialPeriodSelector/);
    assert.match(source, /cashOnly=\{tab === "movements"\}/);
  });

  it("a nova tela usa a API real e não apresenta saldos falsos", async () => {
    const source = await readFile(new URL("../../src/features/financial/general/FinancialAccounts.jsx", import.meta.url), "utf8");
    assert.match(source, /financialAccountsServices\.list/);
    assert.match(source, /controller\.abort\(\)/);
    assert.doesNotMatch(source, /8\.740|2\.460|11\.200/);
  });
});
