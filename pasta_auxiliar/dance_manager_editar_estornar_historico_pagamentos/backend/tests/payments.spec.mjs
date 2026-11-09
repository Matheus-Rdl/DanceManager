import test from "node:test";
import assert from "node:assert/strict";
import { PAYMENT_ACTIVE, paymentCents, sumActivePaymentCents, validatePaymentChange, paymentSnapshot } from "../src/modules/payments/paymentRules.js";
import { buildFinancialMovements } from "../src/modules/financial/financialMovements.js";

const change = { amount: 200, paidAt: "2026-11-09", method: "Pix", reason: "Valor digitado incorretamente", initiatorKey: "vanessa" };

test("edit validates date, amount, and reason", () => {
  const result = validatePaymentChange(change, { edit: true });
  assert.deepEqual([result.amount, result.paidAt, result.method], [200, "2026-11-09T12:00:00.000Z", "Pix"]);
  assert.throws(() => validatePaymentChange({ ...change, paidAt: "2026-02-30" }, { edit: true }), /Data/);
  assert.throws(() => validatePaymentChange({ ...change, amount: 2.555 }, { edit: true }), /casas decimais/);
  assert.throws(() => validatePaymentChange({ ...change, reason: "ok" }, { edit: true }), /justificativa/);
});

test("payment recalculation excludes reversal and preserves partial balance", () => {
  const records = [{ id: "a", amount: 120 }, { id: "b", amount: 120, status: "reversed" }];
  assert.equal(sumActivePaymentCents(records), 12000);
  assert.equal((paymentCents(240) - sumActivePaymentCents(records)) / 100, 120);
  assert.deepEqual(PAYMENT_ACTIVE, { status: { $ne: "reversed" } });
});

test("old payment without status is valid and has a stable snapshot", () => {
  assert.equal(sumActivePaymentCents([{ amount: 75.5 }]), 7550);
  assert.equal(paymentSnapshot({ amount: 75.5, method: "Dinheiro", paidAt: "2026-11-09" }).status, "confirmed");
});

test("cash statement filters reversal but groups partial payments", () => {
  const base = { monthlyFeeId: "fee1", userId: "user1", method: "Pix", paidAt: "2026-11-09T12:00:00Z" };
  const statement = buildFinancialMovements({
    payments: [{ ...base, id: "a", amount: 100 }, { ...base, id: "b", amount: 40 }, { ...base, id: "c", amount: 80, status: "reversed" }],
    fees: [{ id: "fee1", reference: "2026-10" }], users: [{ _id: "user1", user_name: "João" }]
  }, { from: "2026-11", to: "2026-11" });
  assert.equal(statement.rows.length, 1);
  assert.equal(statement.rows[0].amount, 140);
  assert.equal(statement.rows[0].details.length, 2);
  assert.equal(statement.totals.received, 140);
});
