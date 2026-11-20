import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";
import {
  isValidTransferAmount,
  isValidTransferAccountId,
  hasDistinctTransferAccounts,
  isValidTransferTimestamp
} from "../../src/models/financialTransferRules.js";

const NOH = "ec351a0e-ff49-4aae-97c0-9c3778c39f33";
const INFINITE = "9711a5f7-69d3-408f-bbf6-627572287dc9";
const OTHER = "a2b7ce39-7348-4eab-bf54-a51bdcd97d88";

/* EN: Pure business rules are checked without MongoDB or any API implementation.
   PT: Regras puras são verificadas sem MongoDB nem implementação de API. */
describe("Commit 10: transfer amount rules", () => {
  it("accepts positive amounts with zero, one or two decimal places", () => {
    for (const value of [0.01, 1, 50, 200.5, 1200.75, 0.1 + 0.2]) {
      assert.equal(isValidTransferAmount(value), true, String(value));
    }
  });
  it("rejects zero and negative amounts", () => {
    for (const value of [0, -0, -0.01, -500]) assert.equal(isValidTransferAmount(value), false);
  });
  it("rejects fractions of cents", () => {
    for (const value of [0.001, 10.999, 100.0001]) assert.equal(isValidTransferAmount(value), false);
  });
  it("rejects string amounts, empty values, NaN and Infinity", () => {
    for (const value of ["100.00", "", null, undefined, NaN, Infinity, -Infinity, {}]) {
      assert.equal(isValidTransferAmount(value), false);
    }
  });
  it("rejects amounts beyond safe integer cents", () => {
    assert.equal(isValidTransferAmount(Number.MAX_SAFE_INTEGER), false);
  });
});

describe("Commit 10: transfer account rules", () => {
  it("accepts existing UUID shape used by financial accounts", () => {
    for (const id of [NOH, INFINITE, OTHER, NOH.toUpperCase()]) assert.equal(isValidTransferAccountId(id), true);
  });
  it("rejects non-UUID account references", () => {
    for (const id of ["noh", "infinitepay", "507f1f77bcf86cd799439011", "", null, 123, {}, "bad-id"]) {
      assert.equal(isValidTransferAccountId(id), false);
    }
  });
  it("allows either direction and future additional accounts", () => {
    assert.equal(hasDistinctTransferAccounts(NOH, INFINITE), true);
    assert.equal(hasDistinctTransferAccounts(INFINITE, NOH), true);
    assert.equal(hasDistinctTransferAccounts(NOH, OTHER), true);
  });
  it("prevents sending money back to the same account", () => {
    assert.equal(hasDistinctTransferAccounts(NOH, NOH), false);
    assert.equal(hasDistinctTransferAccounts(INFINITE, INFINITE), false);
  });
  it("rejects missing or invalid account references on either side", () => {
    assert.equal(hasDistinctTransferAccounts(NOH, ""), false);
    assert.equal(hasDistinctTransferAccounts(null, INFINITE), false);
    assert.equal(hasDistinctTransferAccounts("Noh", INFINITE), false);
  });
});

describe("Commit 10: timestamp rules", () => {
  it("accepts canonical UTC timestamps, including leap days", () => {
    for (const value of ["2026-11-20T14:00:00.000Z", "2024-02-29T23:59:59.999Z", "2026-07-01T00:00:00.000Z"]) {
      assert.equal(isValidTransferTimestamp(value), true);
    }
  });
  it("rejects date-only, ambiguous local timestamps and offsets", () => {
    for (const value of ["2026-11-20", "2026-11-20T14:00:00", "2026-11-20T11:00:00-03:00", "2026-11-20T14:00:00Z"]) {
      assert.equal(isValidTransferTimestamp(value), false, String(value));
    }
  });
  it("rejects nonexistent calendar dates and invalid times", () => {
    for (const value of ["2026-02-30T00:00:00.000Z", "2026-13-01T00:00:00.000Z", "2026-11-20T25:00:00.000Z", "2026-11-31T00:00:00.000Z"]) {
      assert.equal(isValidTransferTimestamp(value), false, String(value));
    }
  });
  it("rejects non-text and nonfinite timestamps", () => {
    for (const value of [new Date(), null, NaN, "", 1000]) assert.equal(isValidTransferTimestamp(value), false);
  });
});

/* EN: Inspect the real schema declaration in an isolated loader, without pretending to run Mongoose.
   PT: Examina a declaração real do schema sem simular uma validação completa do Mongoose. */
const stub = `
class Schema {
  constructor(definition, options) { this.obj = definition; this.options = options; this.indexes = []; }
  index(fields, options = {}) { this.indexes.push({ fields, options }); }
}
export default { Schema, model(name, schema) { return { modelName: name, schema }; } };
`;
const dataUrl = code => `data:text/javascript,${encodeURIComponent(code)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "mongoose") return { url: dataUrl(stub), shortCircuit: true };
    if (specifier === "./FinancialInitiator.js") {
      return { url: dataUrl('export default { actorSubschema: true };'), shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
});
const { default: FinancialTransfer } = await import("../../src/models/FinancialTransfer.js");
const fields = FinancialTransfer.schema.obj;
const indexes = FinancialTransfer.schema.indexes;

describe("Commit 10: FinancialTransfer model schema", () => {
  it("uses its own financialTransfers collection and keeps school isolation", () => {
    assert.equal(FinancialTransfer.modelName, "FinancialTransfer");
    assert.equal(FinancialTransfer.schema.options.collection, "financialTransfers");
    assert.equal(fields.id.type, String);
    assert.equal(fields.id.required, true);
    assert.equal(fields.schoolId.required, true);
    assert.equal(fields.schoolId.type, String);
  });
  it("references both account IDs as immutable strings, never fixed names", () => {
    assert.equal(fields.fromAccountId.immutable, true);
    assert.equal(fields.toAccountId.immutable, true);
    assert.equal(fields.fromAccountId.type, String);
    assert.equal(fields.toAccountId.type, String);
    assert.equal(fields.fromAccountId.validate.validator, isValidTransferAccountId);
    assert.equal(fields.toAccountId.validate.validator.call({ fromAccountId: NOH }, INFINITE), true);
    assert.equal(fields.toAccountId.validate.validator.call({ fromAccountId: NOH }, NOH), false);
  });
  it("keeps the amount and original transfer date immutable", () => {
    assert.equal(fields.amount.immutable, true);
    assert.equal(fields.amount.validate.validator, isValidTransferAmount);
    assert.equal(fields.transferredAt.immutable, true);
    assert.equal(fields.transferredAt.validate.validator, isValidTransferTimestamp);
  });
  it("does not declare a currentBalance or duplicate revenue/expense values", () => {
    for (const property of ["currentBalance", "balance", "revenueId", "expenseId", "paymentId"]) {
      assert.equal(fields[property], undefined);
    }
  });
  it("requires an idempotency key unique per school", () => {
    assert.equal(fields.idempotencyKey.required, true);
    assert.equal(fields.idempotencyKey.immutable, true);
    assert.ok(indexes.some(i => i.options.unique && i.fields.schoolId === 1 && i.fields.idempotencyKey === 1));
  });
  it("has indexes for source, destination and chronological school history", () => {
    assert.ok(indexes.some(i => i.fields.schoolId === 1 && i.fields.fromAccountId === 1 && i.fields.transferredAt === -1));
    assert.ok(indexes.some(i => i.fields.schoolId === 1 && i.fields.toAccountId === 1 && i.fields.transferredAt === -1));
    assert.ok(indexes.some(i => i.fields.schoolId === 1 && i.fields.transferredAt === -1));
  });
  it("defaults to completed and supports a reversed status without deletion", () => {
    assert.deepEqual(fields.status.enum, ["completed", "reversed"]);
    assert.equal(fields.status.default, "completed");
    assert.equal(fields.reversedAt.default, null);
    assert.equal(fields.reversalReason.default, null);
    assert.equal(fields.reversedAt.required.call({ status: "completed" }), false);
    assert.equal(fields.reversedAt.required.call({ status: "reversed" }), true);
    assert.equal(fields.reversalReason.required.call({ status: "reversed" }), true);
  });
  it("records optional operator and reversal metadata", () => {
    assert.ok(fields.createdBy);
    assert.ok(fields.reversedBy);
    assert.ok(fields.reversalReason);
    assert.ok(fields.createdAt);
    assert.ok(fields.updatedAt);
    assert.equal(fields.note.maxlength, 500);
  });
});
