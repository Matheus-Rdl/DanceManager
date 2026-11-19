import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";
import { isValidInitialBalance, isValidBalanceDate } from "../../src/models/financialAccountRules.js";

/* EN: The received ZIP has no package.json or mongoose dependency. This lightweight loader inspects
       the actual model's schema declaration without a database; it does not emulate Mongoose validation.
   PT: O ZIP recebido não tem package.json nem mongoose. Este carregador examina a definição real
       do model sem banco de dados; não substitui os testes de validação do Mongoose. */
const stub = `
class Schema {
  constructor(definition, options) { this.obj = definition; this.options = options; this.declaredIndexes = []; }
  index(fields, options = {}) { this.declaredIndexes.push({ fields, options }); }
}
const mongoose = { Schema, model: (modelName, schema) => ({ modelName, schema }) };
export default mongoose;
`;
const stubUrl = `data:text/javascript,${encodeURIComponent(stub)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "mongoose") return { url: stubUrl, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});
const { default: FinancialAccount } = await import("../../src/models/FinancialAccount.js");
const fields = FinancialAccount.schema.obj;
const indexes = FinancialAccount.schema.declaredIndexes;

describe("FinancialAccount model: declared schema", () => {
  it("uses the financialAccounts collection", () => {
    assert.equal(FinancialAccount.modelName, "FinancialAccount");
    assert.equal(FinancialAccount.schema.options.collection, "financialAccounts");
  });

  it("keeps string IDs and school separation consistent with the existing financial models", () => {
    assert.equal(fields.id.type, String);
    assert.equal(fields.id.required, true);
    assert.equal(fields.id.unique, true);
    assert.equal(fields.schoolId.type, String);
    assert.equal(fields.schoolId.required, true);
  });

  it("requires manually entered opening balance and balance reference date", () => {
    assert.equal(fields.initialBalance.type, Number);
    assert.equal(fields.initialBalance.required, true);
    assert.equal(fields.initialBalance.default, undefined);
    assert.equal(fields.balanceDate.required, true);
    assert.equal(fields.balanceDate.type, String);
  });

  it("supports Noh, InfinitePay, and future cash accounts without hardcoding names", () => {
    assert.deepEqual(fields.type.enum, ["bank", "payment", "cash"]);
    assert.equal(fields.name.required, true);
    assert.equal(fields.nameKey.lowercase, true);
  });

  it("does not save a mutable currentBalance field", () => {
    assert.equal(fields.currentBalance, undefined);
    assert.equal(fields.balance, undefined);
  });

  it("defaults to active, non-default accounts", () => {
    assert.equal(fields.active.default, true);
    assert.equal(fields.isDefault.default, false);
  });

  it("declares school-scoped unique account names and one default per school", () => {
    assert.ok(indexes.some(i => i.options.unique && i.fields.schoolId === 1 && i.fields.nameKey === 1));
    assert.ok(indexes.some(i => i.options.unique && i.fields.schoolId === 1 && i.fields.isDefault === 1 &&
      i.options.partialFilterExpression?.isDefault === true));
  });

  it("links its custom validators to the tested pure functions", () => {
    assert.equal(fields.initialBalance.validate.validator, isValidInitialBalance);
    assert.equal(fields.balanceDate.validate.validator, isValidBalanceDate);
  });
});

describe("FinancialAccount: opening balance validation", () => {
  it("accepts zero and normal real values", () => {
    for (const value of [0, 1, 0.01, 200, 2500.75, 0.1 + 0.2]) {
      assert.equal(isValidInitialBalance(value), true, String(value));
    }
  });

  it("accepts a negative opening balance if the account is overdrawn", () => {
    assert.equal(isValidInitialBalance(-150.25), true);
  });

  it("rejects fractions of cents and nonfinite or nonnumeric values", () => {
    for (const value of [0.001, 12.345, NaN, Infinity, -Infinity, "200", null, 1e15]) {
      assert.equal(isValidInitialBalance(value), false, String(value));
    }
  });
});

describe("FinancialAccount: date validation", () => {
  it("accepts valid ISO calendar dates including leap days", () => {
    for (const value of ["2026-11-19", "2024-02-29", "1900-01-01", "2200-12-31"]) {
      assert.equal(isValidBalanceDate(value), true, value);
    }
  });

  it("rejects nonexistent and malformed dates", () => {
    for (const value of ["2026-02-29", "2026-02-30", "2026-13-01", "2026-00-10",
      "2026-11-31", "2026-1-1", "2026-11-19T12:00:00", "1899-12-31", "2201-01-01", null]) {
      assert.equal(isValidBalanceDate(value), false, String(value));
    }
  });
});
