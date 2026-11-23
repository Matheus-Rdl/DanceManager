import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { createTransferSubmission, newTransferOperationKey } from
  "../../src/features/financial/general/financialTransferSubmission.js";

const accounts = [
  { id: "noh-1", name: "Noh", active: true, available: true, balance: 900 },
  { id: "infinite-1", name: "InfinitePay", active: true, available: true, balance: 200 }
];
const draft = () => ({
  fromAccountId: "noh-1", toAccountId: "infinite-1", amount: "125,35",
  initiatorKey: "vanessa", note: "Repasse interno"
});

/* EN: Assert the real transfer POST payload and idempotent retry semantics without MongoDB.
   PT: Confere o payload real da API e tentativas idempotentes sem depender do MongoDB. */
describe("Commit 16: envio de transferência", () => {
  it("gera chave com formato aceito pelo backend usando UUID criptográfico", () => {
    const key = newTransferOperationKey();
    assert.match(key, /^transfer_[a-f\d-]{36}$/i);
    assert.match(key, /^[A-Za-z0-9_-]{8,128}$/);
  });

  it("envia somente contas, valor numérico, responsável, observação e chave", async () => {
    const requests = [];
    const manager = createTransferSubmission({
      send: async payload => { requests.push(payload); return { id: "transfer-1" }; },
      makeKey: () => "operation_12345"
    });
    const saved = await manager.submit(draft(), accounts);
    assert.equal(saved.id, "transfer-1");
    assert.deepEqual(requests, [{
      fromAccountId: "noh-1", toAccountId: "infinite-1", amount: 125.35,
      initiatorKey: "vanessa", note: "Repasse interno", idempotencyKey: "operation_12345"
    }]);
    assert.equal(manager.wasSubmitted(), true);
  });

  it("bloqueia duas confirmações simultâneas com uma única chamada à API", async () => {
    let release;
    let calls = 0;
    const pendingNetwork = new Promise(resolve => { release = resolve; });
    const manager = createTransferSubmission({
      send: async () => { calls++; return pendingNetwork; }, makeKey: () => "retry_key_00001"
    });
    const a = manager.submit(draft(), accounts);
    const b = manager.submit(draft(), accounts);
    assert.equal(a, b);
    assert.equal(manager.isPending(), true);
    assert.equal(manager.invalidate(), false);
    await Promise.resolve();
    assert.equal(calls, 1);
    release({ id: "t-1" });
    assert.equal((await a).id, "t-1");
    assert.equal(manager.isPending(), false);
    assert.equal(manager.wasSubmitted(), true);
    assert.equal(calls, 1);
  });

  it("não envia novamente uma transferência já confirmada", async () => {
    let calls = 0;
    const manager = createTransferSubmission({
      send: async () => { calls++; return { id: "t-1" }; },
      makeKey: () => "confirmed_12345"
    });
    await manager.submit(draft(), accounts);
    await assert.rejects(manager.submit(draft(), accounts), /já foi registrada/);
    assert.equal(calls, 1);
  });

  it("reutiliza a mesma chave após erro de conexão ou resposta incerta", async () => {
    const keys = [];
    let attempts = 0;
    const manager = createTransferSubmission({
      send: async data => {
        keys.push(data.idempotencyKey);
        if (attempts++ === 0) throw new Error("Network error");
        return { id: "reused-t1" };
      },
      makeKey: () => "retry_same_key_01"
    });
    await assert.rejects(manager.submit(draft(), accounts), /Network error/);
    assert.equal(manager.wasSubmitted(), false);
    assert.equal((await manager.submit(draft(), accounts)).id, "reused-t1");
    assert.deepEqual(keys, ["retry_same_key_01", "retry_same_key_01"]);
  });

  it("reutiliza a chave quando a resposta não confirma o ID gravado", async () => {
    const keys = [];
    let first = true;
    const manager = createTransferSubmission({
      send: async data => { keys.push(data.idempotencyKey); if (first) { first = false; return {}; } return { id: "t2" }; },
      makeKey: () => "lost_response_123"
    });
    await assert.rejects(manager.submit(draft(), accounts), /não confirmou/);
    await manager.submit(draft(), accounts);
    assert.deepEqual(keys, ["lost_response_123", "lost_response_123"]);
  });

  it("trocar os dados gera uma nova chave somente após encerrar a tentativa", async () => {
    let sequence = 0;
    const keys = [];
    const manager = createTransferSubmission({
      send: async data => { keys.push(data.idempotencyKey); return { id: `t${sequence}` }; },
      makeKey: () => `operation_key_${++sequence}`
    });
    await manager.submit(draft(), accounts);
    assert.equal(manager.invalidate(), true);
    await manager.submit({ ...draft(), amount: "100,00" }, accounts);
    assert.deepEqual(keys, ["operation_key_1", "operation_key_2"]);
  });

  it("não faz requisição quando o formulário é inválido", async () => {
    let called = false;
    const manager = createTransferSubmission({
      send: async () => { called = true; return { id: "should-not-create" }; },
      makeKey: () => "unused_key_001"
    });
    await assert.rejects(manager.submit({ ...draft(), toAccountId: "noh-1" }, accounts), /Confira os dados/);
    await assert.rejects(manager.submit({ ...draft(), amount: "900,01" }, accounts), /Confira os dados/);
    assert.equal(called, false);
  });
});

describe("Commit 16: integração visual e proteção contra erros", () => {
  it("mantém o Dialog bloqueado durante envio e exibe falhas do backend", async () => {
    const source = await readFile(new URL("../../src/features/financial/general/TransferDialog.jsx", import.meta.url), "utf8");
    assert.match(source, /loading=\{submitting\}/);
    assert.match(source, /closeOnEscape=\{!submitting\}/);
    assert.match(source, /closeOnInteractOutside=\{!submitting\}/);
    assert.match(source, /role="alert"/);
    assert.match(source, /onCompleted\?\.\(\)/);
    assert.match(source, /submissionRef\.current\.isPending\(\)/);
  });

  it("mantém o formulário com confirmação em dois passos e seletores dinâmicos", async () => {
    const source = await readFile(new URL("../../src/features/financial/general/TransferDialog.jsx", import.meta.url), "utf8");
    assert.match(source, /Confirmar transferência/);
    assert.match(source, /Conferir dados/);
    assert.match(source, /availableAccounts\.filter\(account => account\.id !== draft\.fromAccountId\)/);
    assert.match(source, /financialInitiators\.map/);
  });
});
