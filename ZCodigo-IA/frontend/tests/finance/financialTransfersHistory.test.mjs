import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { financialTransferDateTime, financialTransferStatus,
  normalizeFinancialTransfersHistory } from "../../src/features/financial/general/financialTransfersHistoryView.js";

/* EN: Test the same history envelope returned by GET /financial-transfers.
   PT: Testa o formato devolvido por GET /financial-transfers. */
describe("Commit 20: histórico paginado de transferências", () => {
  const fixture = (page = 1, total = 12) => ({
    items: [{ id: "transfer-1", fromAccountId: "noh", toAccountId: "infinite", amount: 85.50,
      status: "reversed", transferredAt: "2026-07-10T15:00:00.000Z",
      reversedAt: "2026-07-12T14:00:00.000Z" }], total, page, limit: 10
  });
  it("mantém o valor e o status original de operações estornadas", () => {
    const result = normalizeFinancialTransfersHistory(fixture());
    assert.equal(result.items[0].amount, 85.50);
    assert.equal(financialTransferStatus(result.items[0].status), "Estornada");
    assert.equal(financialTransferStatus("completed"), "Concluída");
    assert.equal(result.total, 12);
  });
  it("paginação considera o total do servidor, não a quantidade desta página", () => {
    assert.deepEqual([normalizeFinancialTransfersHistory(fixture(1)).hasPrevious,
      normalizeFinancialTransfersHistory(fixture(1)).hasNext], [false, true]);
    assert.deepEqual([normalizeFinancialTransfersHistory(fixture(2)).hasPrevious,
      normalizeFinancialTransfersHistory(fixture(2)).hasNext], [true, false]);
  });
  it("não transforma respostas quebradas em um histórico falsamente vazio", () => {
    for (const invalid of [null, {}, { items: [], total: -1, page: 1, limit: 10 },
      { items: [], total: 10, page: 0, limit: 10 }]) {
      assert.throws(() => normalizeFinancialTransfersHistory(invalid), /Resposta inesperada/);
    }
  });
  it("exibe datas no fuso de São Paulo, mesmo quando o backend usa UTC", () => {
    assert.match(financialTransferDateTime("2026-07-10T15:00:00.000Z"), /10\/07\/2026/);
    assert.equal(financialTransferDateTime("data inválida"), "Data não disponível");
  });
  it("a tela ignora respostas antigas, preserva os saldos e recarrega após transferências", () => {
    const history = readFileSync(new URL("../../src/features/financial/general/FinancialTransfersList.jsx", import.meta.url), "utf8");
    const accounts = readFileSync(new URL("../../src/features/financial/general/FinancialAccounts.jsx", import.meta.url), "utf8");
    assert.match(history, /request\.abort\(\)/);
    assert.match(history, /financialTransfersServices\.list\(/);
    assert.match(history, /refreshKey/);
    assert.match(history, /reversedAt/);
    assert.match(accounts, /<FinancialTransfersList accounts=\{view\.accounts\} refreshKey=\{retryKey \+ refreshKey\}/);
    assert.ok(accounts.indexOf("<FinancialAccountsSummary") < accounts.indexOf("<FinancialTransfersList"));
    assert.doesNotMatch(history, /financialTransfersServices\.(create|reverse)\(/);
  });
});
