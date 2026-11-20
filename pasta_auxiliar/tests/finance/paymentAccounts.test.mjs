import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import {
  validateRequestedPaymentAccountId, resolvePaymentAccountId
} from "../../src/modules/payments/paymentAccountRules.js";
import { paymentSnapshot, validatePaymentChange } from "../../src/modules/payments/paymentRules.js";

const NOH = "123e4567-e89b-42d3-a456-426614174000";
const INFINITE = "123e4567-e89b-42d3-a456-426614174001";
const FOREIGN = "123e4567-e89b-42d3-a456-426614174002";
const makeAccount = (id, schoolId = "school-test", changes = {}) =>
  ({ id, schoolId, active: true, isDefault: id === NOH, ...changes });
const accounts = () => [makeAccount(NOH), makeAccount(INFINITE), makeAccount(FOREIGN, "other-school")];
const errCode = statusCode => error => error?.statusCode === statusCode;

/* EN: A minimal query double executes the real account resolution rules without MongoDB.
   PT: Uma simulação de consulta exercita as regras reais de contas sem MongoDB. */
const fakeAccounts = state => ({
  findOne(query) {
    return { session(session) {
      assert.ok(session);
      return { lean: async () => state.accounts.find(account =>
        Object.entries(query).every(([key, value]) => account[key] === value)) || null };
    } };
  }
});
const resolve = (state, id = undefined) => resolvePaymentAccountId({ requestedAccountId: id,
  model: fakeAccounts(state), schoolId: "school-test", session: {} });

describe("Commit 05: regras de conta nos pagamentos", () => {
  it("mantém a conta ausente diferente de valores nulos ou inválidos", () => {
    assert.equal(validateRequestedPaymentAccountId(undefined), undefined);
    for (const value of [null, "", "invalid", 1, false, {}, "123e4567-e89b-42d3-a456-426614174000 "]) {
      assert.throws(() => validateRequestedPaymentAccountId(value), errCode(400));
    }
  });
  it("seleciona a conta específica ativa da escola do servidor", async () => {
    assert.equal(await resolve({ accounts: accounts() }, INFINITE), INFINITE);
  });
  it("associa automaticamente a conta padrão ativa quando o frontend não envia conta", async () => {
    assert.equal(await resolve({ accounts: accounts() }), NOH);
  });
  it("rejeita conta de outra escola ou que não existe", async () => {
    await assert.rejects(resolve({ accounts: accounts() }, FOREIGN), errCode(404));
    await assert.rejects(resolve({ accounts: accounts() }, "123e4567-e89b-42d3-a456-426614174099"), errCode(404));
  });
  it("rejeita conta desativada e padrão desativado", async () => {
    const state = { accounts: [makeAccount(NOH, "school-test", { active: false }), makeAccount(INFINITE)] };
    await assert.rejects(resolve(state, NOH), errCode(404));
    await assert.rejects(resolve(state), errCode(409));
  });
  it("mantém pagamentos legados quando nenhuma conta foi cadastrada", async () => {
    assert.equal(await resolve({ accounts: [] }), null);
  });
  it("não cria pagamento sem conta quando existem contas sem padrão", async () => {
    await assert.rejects(resolve({ accounts: [makeAccount(INFINITE)] }), errCode(409));
  });
  it("preserva o snapshot legado e registra a conta em snapshots novos", () => {
    const fields = { amount: 20, method: "pix", paidAt: "2026-11-20", receipt: false };
    assert.ok(!Object.hasOwn(paymentSnapshot(fields), "accountId"));
    assert.equal(paymentSnapshot({ ...fields, accountId: INFINITE }).accountId, INFINITE);
  });
  it("uma edição só altera a conta quando accountId foi enviado", () => {
    const data = { reason: "Correção comprovada pela cliente", amount: 20, method: "pix",
      paidAt: "2026-11-20", receipt: false };
    assert.ok(!Object.hasOwn(validatePaymentChange(data, { edit: true }), "accountId"));
    assert.equal(validatePaymentChange({ ...data, accountId: INFINITE }, { edit: true }).accountId, INFINITE);
  });
});

/* EN: Intercept external and model imports so the real payments DataAccess is exercised
       against session-aware in-memory doubles. No database or npm packages are required.
   PT: Intercepta imports externos e de models para executar o DataAccess real com
       simulações de consultas e sessões. Não precisa de banco nem pacotes npm. */
const data = code => `data:text/javascript,${encodeURIComponent(code)}`;
const mocks = {
  mongoose: `export default { startSession: async () => ({ withTransaction: fn => fn(), endSession: async () => {} }) };`,
  "../../models/Payment.js": `
const db = globalThis.__payment05Fixture;
export default class Payment {
  constructor(props) { Object.assign(this, { auditHistory: [], status: "confirmed" }, props); }
  static findOne(filter) { return { session: () => Promise.resolve(db.payments.find(p => p.id === filter.id)
    ? new Payment(structuredClone(db.payments.find(p => p.id === filter.id))) : null) }; }
  static find(filter) { return { session: () => ({ lean: async () => db.payments.filter(p =>
    p.monthlyFeeId === filter.monthlyFeeId && p.status !== "reversed").map(p => ({ ...p })) }) }; }
  async save() { const index = db.payments.findIndex(p => p.id === this.id);
    if (index === -1) db.payments.push(this.toObject()); else db.payments[index] = this.toObject(); }
  toObject() { return structuredClone({ ...this }); }
}
`,
  "../../models/MonthlyFee.js": `
const db = globalThis.__payment05Fixture;
export default class MonthlyFee {
  constructor(props) { Object.assign(this, props); }
  static findOne(filter) { return { session: () => Promise.resolve(db.fees.find(f => f.id === filter.id)
    ? new MonthlyFee(structuredClone(db.fees.find(f => f.id === filter.id))) : null) }; }
  async save() { const index = db.fees.findIndex(f => f.id === this.id);
    if (index === -1) throw new Error("missing fee"); db.fees[index] = this.toObject(); }
  toObject() { return structuredClone({ ...this }); }
}
`,
  "../../models/FinancialAccount.js": `
export default { findOne: filter => ({ session: () => ({ lean: async () =>
  globalThis.__payment05Fixture.accounts.find(account =>
    Object.entries(filter).every(([key, value]) => account[key] === value)) || null }) }) };
`,
  "../expenses/expenseRules.js": `export const schoolId = () => "school-test";`,
  "../monthlyFees/monthlyFeesDataAccess.js": `
export default class MonthlyFeesDataAccess { getStatus(fee) {
  return fee.paidAmount >= fee.amount ? "paid" : fee.paidAmount > 0 ? "partial" : "pending";
} }
`
};
registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.endsWith("/src/modules/payments/paymentsDataAccess.js") && Object.hasOwn(mocks, specifier)) {
    return { url: data(mocks[specifier]), shortCircuit: true };
  }
  return nextResolve(specifier, context);
}});
globalThis.__payment05Fixture = { accounts: [], payments: [], fees: [] };
const { default: PaymentsDataAccess } = await import("../../src/modules/payments/paymentsDataAccess.js");
const fixture = (options = {}) => ({
  accounts: accounts(), payments: [],
  fees: [{ id: "fee-1", contractId: "contract-1", userId: "student-1", amount: 500,
    paidAmount: 0, status: "pending" }], ...options
});
const newPayment = (props = {}) => ({ amount: 150, method: "pix", paidAt: "2026-11-20",
  receipt: true, ...props });
const change = (props = {}) => ({ reason: "Ajuste confirmado com comprovante", amount: 120,
  method: "pix", paidAt: "2026-11-20", receipt: false, ...props });

describe("Commit 05: pagamentos com contas (DataAccess isolado)", () => {
  it("registra a conta padrão para pagamentos sem accountId", async () => {
    Object.assign(globalThis.__payment05Fixture, fixture());
    const { payment, monthlyFee } = await new PaymentsDataAccess().addPayment("fee-1", newPayment());
    assert.equal(payment.accountId, NOH);
    assert.equal(monthlyFee.paidAmount, 150);
    assert.equal(monthlyFee.status, "partial");
  });
  it("mantém a conta individual em dois pagamentos parciais da mesma mensalidade", async () => {
    Object.assign(globalThis.__payment05Fixture, fixture());
    const dao = new PaymentsDataAccess();
    await dao.addPayment("fee-1", newPayment({ amount: 100 }));
    await dao.addPayment("fee-1", newPayment({ amount: 200, accountId: INFINITE }));
    assert.deepEqual(globalThis.__payment05Fixture.payments.map(p => p.accountId), [NOH, INFINITE]);
    assert.equal(globalThis.__payment05Fixture.fees[0].paidAmount, 300);
  });
  it("não grava pagamentos com conta inativa, estrangeira ou inexistente", async () => {
    for (const id of [FOREIGN, "123e4567-e89b-42d3-a456-426614174099"]) {
      Object.assign(globalThis.__payment05Fixture, fixture());
      await assert.rejects(new PaymentsDataAccess().addPayment("fee-1", newPayment({ accountId: id })), errCode(404));
      assert.equal(globalThis.__payment05Fixture.payments.length, 0);
    }
  });
  it("rejeita accountId inválido antes de iniciar a transação", async () => {
    Object.assign(globalThis.__payment05Fixture, fixture());
    await assert.rejects(new PaymentsDataAccess().addPayment("fee-1", newPayment({ accountId: null })), errCode(400));
    assert.equal(globalThis.__payment05Fixture.payments.length, 0);
  });
  it("edita valor e mantém a conta original quando o formulário não informa accountId", async () => {
    Object.assign(globalThis.__payment05Fixture, fixture());
    const dao = new PaymentsDataAccess();
    const { payment } = await dao.addPayment("fee-1", newPayment());
    const result = await dao.changePayment(payment.id, change(), "edited");
    assert.equal(result.payment.accountId, NOH);
    assert.equal(result.payment.amount, 120);
    assert.equal(result.payment.auditHistory[0].before.accountId, NOH);
    assert.equal(result.payment.auditHistory[0].after.accountId, NOH);
  });
  it("altera a conta quando foi explicitamente enviada e preserva histórico auditável", async () => {
    Object.assign(globalThis.__payment05Fixture, fixture());
    const dao = new PaymentsDataAccess();
    const { payment } = await dao.addPayment("fee-1", newPayment());
    const result = await dao.changePayment(payment.id, change({ amount: 150, receipt: true, accountId: INFINITE }), "edited");
    assert.equal(result.payment.accountId, INFINITE);
    assert.equal(result.payment.auditHistory[0].before.accountId, NOH);
    assert.equal(result.payment.auditHistory[0].after.accountId, INFINITE);
  });
  it("impede mudança para conta inativa e preserva o pagamento", async () => {
    Object.assign(globalThis.__payment05Fixture, fixture());
    const dao = new PaymentsDataAccess();
    const { payment } = await dao.addPayment("fee-1", newPayment());
    globalThis.__payment05Fixture.accounts.find(a => a.id === INFINITE).active = false;
    await assert.rejects(dao.changePayment(payment.id, change({ accountId: INFINITE }), "edited"), errCode(404));
    assert.equal(globalThis.__payment05Fixture.payments[0].accountId, NOH);
  });
  it("não modifica a conta ao estornar um pagamento existente", async () => {
    Object.assign(globalThis.__payment05Fixture, fixture());
    const dao = new PaymentsDataAccess();
    const { payment } = await dao.addPayment("fee-1", newPayment());
    const result = await dao.changePayment(payment.id, { reason: "Estorno administrativo autorizado" }, "reversed");
    assert.equal(result.payment.status, "reversed");
    assert.equal(result.payment.accountId, NOH);
    assert.equal(result.monthlyFee.paidAmount, 0);
  });
  it("deixa pagamentos sem conta em modo legado se ainda não há contas cadastradas", async () => {
    Object.assign(globalThis.__payment05Fixture, fixture({ accounts: [] }));
    const result = await new PaymentsDataAccess().addPayment("fee-1", newPayment());
    assert.equal(result.payment.accountId, null);
  });
  it("mantém o modelo de documento sem criar uma conta na mensalidade", () => {
    const payment = readFileSync(new URL("../../src/models/Payment.js", import.meta.url), "utf8");
    const fee = readFileSync(new URL("../../src/models/MonthlyFee.js", import.meta.url), "utf8");
    assert.match(payment, /accountId: \{ type: String, default: null, index: true \}/);
    assert.doesNotMatch(fee, /accountId:/);
  });
});
