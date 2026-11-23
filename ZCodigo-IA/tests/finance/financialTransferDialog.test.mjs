import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import {
  activeTransferAccounts, parseTransferAmount, validateTransferDraft
} from "../../src/features/financial/general/financialTransferDraft.js";

const accounts = [
  { id: "id-noh", name: "Noh", active: true, available: true, balance: 1200.25 },
  { id: "id-infinite", name: "InfinitePay", active: true, available: true, balance: 300 },
  { id: "id-cash", name: "Carteira", active: false, available: true, balance: 50 }
];
const validDraft = () => ({
  fromAccountId: "id-noh", toAccountId: "id-infinite", amount: "600,00", initiatorKey: "pety", note: "Repasse"
});
const readSource = name => readFile(new URL(`../../src/features/financial/general/${name}`, import.meta.url), "utf8");

/* EN: Pure tests verify draft validation independently of Chakra and the backend.
   PT: Os testes puros validam o formulário sem depender do Chakra ou do backend. */
describe("Commit 15: valor da transferência", () => {
  it("aceita valores brasileiros e até duas casas decimais", () => {
    assert.equal(parseTransferAmount("600"), 600);
    assert.equal(parseTransferAmount("600,5"), 600.5);
    assert.equal(parseTransferAmount("1.234,50"), 1234.5);
    assert.equal(parseTransferAmount("600.50"), 600.5);
    assert.equal(parseTransferAmount("0,01"), 0.01);
  });
  it("não arredonda valores e rejeita formas inválidas", () => {
    for (const value of ["", " ", "0", "-5", "1,234", "1.23,4", "1 200", "R$ 10", "10,", ".5", "1,2,3", "abc", 2, null, "9999999999999999999"]) {
      assert.equal(parseTransferAmount(value), null, `Input ${String(value)} deveria ser inválido`);
    }
  });
});

describe("Commit 15: contas e validação local", () => {
  it("oferece somente contas ativas e aceita contas futuras", () => {
    const available = activeTransferAccounts([...accounts, { id: "id-3", name: "Nova conta", active: true }]);
    assert.deepEqual(available.map(item => item.id), ["id-noh", "id-infinite", "id-3"]);
    assert.deepEqual(activeTransferAccounts(undefined), []);
  });
  it("aceita rascunho válido e conserva IDs reais", () => {
    const result = validateTransferDraft(validDraft(), accounts);
    assert.equal(result.valid, true);
    assert.equal(result.amount, 600);
    assert.equal(result.from.id, "id-noh");
    assert.equal(result.to.id, "id-infinite");
  });
  it("rejeita conta de origem e destino iguais", () => {
    const draft = { ...validDraft(), toAccountId: "id-noh" };
    assert.match(validateTransferDraft(draft, accounts).errors.toAccountId, /diferente/);
  });
  it("rejeita contas inexistentes e inativas", () => {
    assert.ok(validateTransferDraft({ ...validDraft(), fromAccountId: "invalid" }, accounts).errors.fromAccountId);
    assert.ok(validateTransferDraft({ ...validDraft(), toAccountId: "id-cash" }, accounts).errors.toAccountId);
  });
  it("rejeita valor que ultrapasse o saldo da conta de origem", () => {
    assert.match(validateTransferDraft({ ...validDraft(), amount: "1200,26" }, accounts).errors.amount, /excede/);
    assert.equal(validateTransferDraft({ ...validDraft(), amount: "1200,25" }, accounts).valid, true);
  });
  it("não trata saldo ausente ou indisponível como zero disponível", () => {
    const unavailable = [{ ...accounts[0], available: false }, accounts[1]];
    assert.match(validateTransferDraft(validDraft(), unavailable).errors.fromAccountId, /indisponível/);
    const missing = [{ ...accounts[0], balance: null }, accounts[1]];
    assert.match(validateTransferDraft(validDraft(), missing).errors.fromAccountId, /indisponível/);
  });
  it("exige responsável permitido pelo backend", () => {
    assert.match(validateTransferDraft({ ...validDraft(), initiatorKey: "" }, accounts).errors.initiatorKey, /responsável/);
    assert.match(validateTransferDraft({ ...validDraft(), initiatorKey: "admin" }, accounts).errors.initiatorKey, /responsável/);
    assert.equal(validateTransferDraft({ ...validDraft(), initiatorKey: "vanessa" }, accounts).valid, true);
  });
  it("aceita observação opcional de até 500 caracteres", () => {
    assert.equal(validateTransferDraft({ ...validDraft(), note: "" }, accounts).valid, true);
    assert.equal(validateTransferDraft({ ...validDraft(), note: "a".repeat(500) }, accounts).valid, true);
    assert.ok(validateTransferDraft({ ...validDraft(), note: "a".repeat(501) }, accounts).errors.note);
  });
  it("não valida formulário incompleto", () => {
    const result = validateTransferDraft({ fromAccountId: "", toAccountId: "", amount: "", initiatorKey: "", note: "" }, accounts);
    assert.equal(result.valid, false);
    assert.deepEqual(Object.keys(result.errors).sort(), ["amount", "fromAccountId", "initiatorKey", "toAccountId"]);
  });
});

describe("Commit 15: integração visual sem gravação", () => {
  it("usa Dialog e select dinâmico de origem e destino", async () => {
    const src = await readSource("TransferDialog.jsx");
    assert.match(src, /<Dialog\.Root/);
    assert.match(src, /<NativeSelect\.Field id="transfer-origin"/);
    assert.match(src, /<NativeSelect\.Field id="transfer-destination"/);
    assert.match(src, /availableAccounts\.filter\(account => account\.id !== draft\.fromAccountId\)/);
    assert.match(src, /<option key=\{account\.id\} value=\{account\.id\}>/);
  });
  it("apresenta conferência e nunca chama API ou altera saldos", async () => {
    const src = await readSource("TransferDialog.jsx");
    assert.match(src, /setReviewing\(result\.valid\)/);
    assert.match(src, /Conferir dados/);
    assert.doesNotMatch(src, /financialTransfersServices|\.create\(|fetch\(/);
  });
  it("exige responsável e permite observação de até 500 caracteres", async () => {
    const src = await readSource("TransferDialog.jsx");
    assert.match(src, /financialInitiators\.map/);
    assert.match(src, /maxLength=\{500\}/);
    assert.match(src, /onOpenChange=\{event =>/);
  });
  it("abre pelo menu Contas apenas com duas contas ativas", async () => {
    const src = await readSource("FinancialAccounts.jsx");
    assert.match(src, /activeAccounts\.length < 2/);
    assert.match(src, /onClick=\{\(\) => setTransferOpen\(true\)\}/);
    assert.match(src, /<TransferDialog open=\{transferOpen\} onClose=\{\(\) => setTransferOpen\(false\)\}/);
    assert.doesNotMatch(src, /financialTransfersServices\.create/);
  });
});
