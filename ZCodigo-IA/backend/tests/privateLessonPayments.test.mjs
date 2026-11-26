import test from "node:test";
import assert from "node:assert/strict";
import { paymentFields, paymentSummary, brazilPaymentDate } from "../src/models/privateLessonPaymentRules.js";
import PrivateLessonPaymentsDataAccess from "../src/modules/privateLessonPayments/privateLessonPaymentsDataAccess.js";

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const packageId = id(1), accountId = id(2), account2 = id(3);
const today = "2026-11-26", clock = () => new Date("2026-11-26T16:00:00.000Z");
const body = (n = 10, amount = 300, extra = {}) => ({ requestId: id(n), amount, receivedAt: today, method: "Pix", accountId, ...extra });
const copy = x => structuredClone(x);
const session = { inTransaction: () => true };
function fixture(overrides = {}) {
  let pkg = { id: packageId, schoolId: "default", status: "active", amount: 760, contractedOn: "2026-11-01", __v: 0, ...overrides };
  const accounts = [{ id: accountId, schoolId: "default", active: true, balanceDate: "2026-06-30" }, { id: account2, schoolId: "default", active: true, balanceDate: "2026-06-30" }, { id: id(4), schoolId: "other", active: true, balanceDate: "2026-06-30" }, { id: id(5), schoolId: "default", active: false, balanceDate: "2026-06-30" }];
  const calls = { writes: 0, accounts: 0, race: false };
  const query = value => ({ session(s) { assert.equal(s, session); return this; }, async lean() { return copy(value); } });
  const match = (row, q) => row && Object.entries(q).every(([k,v]) => k === "payments.requestId" ? !(row.payments ?? []).some(p => p.requestId === v.$ne) : row[k] === v);
  const packageModel = { findOne: q => query(match(pkg,q) ? pkg : null), findOneAndUpdate(q,u,o) {
    assert.equal(o.session, session); assert.equal(o.runValidators,true);
    if (calls.race || !match(pkg,q)) return query(null);
    calls.writes++; pkg = { ...pkg, ...u.$set, payments: [...(pkg.payments ?? []),copy(u.$push.payments)], __v: pkg.__v + u.$inc.__v }; return query(pkg);
  }};
  const accountModel = { findOne(q) { calls.accounts++; return query(accounts.find(a => match(a,q)) ?? null); } };
  let n = 100;
  const access = (school = "default") => new PrivateLessonPaymentsDataAccess({ packageModel, accountModel, resolveSchoolId: () => school, clock, makeId: () => id(n++) });
  return { access, calls, accounts, row: () => copy(pkg) };
}
const rejects = (promise, code) => assert.rejects(promise,{statusCode:code});

test("legacy packages start pending with no payment or due date", async () => {
  const {access,calls} = fixture();
  assert.deepEqual(await access().get(packageId),{ packageId, contractedAmount:760, paidAmount:0, outstandingAmount:760, paymentStatus:"pending", paymentCount:0, payments:[] });
  assert.equal(calls.writes,0);
});
test("partial payments in multiple accounts settle one shared package", async () => {
  const {access,row,calls}=fixture(); const x=access();
  let r=await x.appendInTransaction(packageId,body(),session);
  assert.equal(r.summary.outstandingAmount,460); assert.equal(r.summary.paymentStatus,"partial");
  r=await x.appendInTransaction(packageId,body(11,200,{accountId:account2}),session);
  assert.equal(r.summary.outstandingAmount,260);
  r=await x.appendInTransaction(packageId,body(12,260),session);
  assert.equal(r.summary.paidAmount,760); assert.equal(r.summary.outstandingAmount,0); assert.equal(r.summary.paymentStatus,"paid");
  assert.equal(row().status,"active"); assert.equal(row().__v,3); assert.equal(calls.writes,3);
  assert.deepEqual(row().payments.map(p=>p.accountId),[accountId,account2,accountId]);
});
test("integer cents prevent floating point errors", async () => {
  const {access}=fixture({amount:0.3}); const x=access();
  await x.appendInTransaction(packageId,body(10,0.1),session);
  const r=await x.appendInTransaction(packageId,body(11,0.2),session);
  assert.equal(r.summary.paymentStatus,"paid"); assert.equal(r.summary.outstandingAmount,0);
});
test("rejects zero, negative, strings, excessive precision, invalid IDs and unknown fields", () => {
  for (const amount of [0,-1,"300",NaN,Infinity,0.001,0.0000000001,Number.MAX_SAFE_INTEGER]) assert.throws(()=>paymentFields(body(10,amount),today),{statusCode:400});
  for (const extra of [{accountId:"bad"},{requestId:"bad"},{method:" "},{notes:null},{notes:"x".repeat(501)},{schoolId:"other"},{paidAmount:1},{status:"paid"}]) assert.throws(()=>paymentFields(body(10,300,extra),today),{statusCode:400});
});
test("rejects invalid and future receipt dates using Brazil calendar", () => {
  assert.equal(brazilPaymentDate(new Date("2026-11-27T01:00:00.000Z")),today);
  for(const receivedAt of ["2026-11-27","2026-02-30","26/11/2026",null]) assert.throws(()=>paymentFields(body(10,300,{receivedAt}),today),{statusCode:400});
});
test("overpayment and extra payment after settlement never write", async () => {
  const {access,calls}=fixture(); const x=access();
  await rejects(x.appendInTransaction(packageId,body(10,760.01),session),409);
  await x.appendInTransaction(packageId,body(10,760),session);
  await rejects(x.appendInTransaction(packageId,body(11,0.01),session),409);
  assert.equal(calls.writes,1);
});
test("completed packages may receive; cancelled packages cannot", async () => {
  const complete=fixture({status:"completed"}); const cancelled=fixture({status:"cancelled"});
  assert.equal((await complete.access().appendInTransaction(packageId,body(),session)).summary.paymentStatus,"partial");
  await rejects(cancelled.access().appendInTransaction(packageId,body(),session),409); assert.equal(cancelled.calls.writes,0);
});
test("account must exist, belong to the school and be active", async () => {
  const {access,calls}=fixture(); const x=access();
  for(const accountId of [id(4),id(5),id(6)]) await rejects(x.appendInTransaction(packageId,body(10,300,{accountId}),session),404);
  assert.equal(calls.writes,0);
});
test("receipt cannot predate the purchase or be included in an opening account balance", async () => {
  const {access,accounts,calls}=fixture(); const x=access();
  await rejects(x.appendInTransaction(packageId,body(10,300,{receivedAt:"2026-10-31"}),session),400);
  accounts[0].balanceDate=today;
  await rejects(x.appendInTransaction(packageId,body(),session),409); assert.equal(calls.writes,0);
});
test("same request returns original receipt without second write, even if account became inactive", async () => {
  const {access,accounts,calls}=fixture(); const x=access();
  const first=await x.appendInTransaction(packageId,body(),session); accounts[0].active=false;
  const retry=await x.appendInTransaction(packageId,body(),session);
  assert.equal(retry.replayed,true); assert.deepEqual(retry.payment,first.payment); assert.equal(calls.writes,1); assert.equal(calls.accounts,1);
});
test("same request key with different amount or account conflicts", async () => {
  const {access,calls}=fixture(); const x=access(); await x.appendInTransaction(packageId,body(),session);
  await rejects(x.appendInTransaction(packageId,body(10,301),session),409);
  await rejects(x.appendInTransaction(packageId,body(10,300,{accountId:account2}),session),409); assert.equal(calls.writes,1);
});
test("optimistic concurrency blocks a racing write", async () => {
  const {access,calls}=fixture(); calls.race=true;
  await rejects(access().appendInTransaction(packageId,body(),session),409); assert.equal(calls.writes,0);
});
test("no write without an active transaction and no cross-school access", async () => {
  const {access,calls}=fixture(); const x=access();
  await rejects(x.appendInTransaction(packageId,body(),undefined),409);
  await rejects(x.appendInTransaction(packageId,body(),{inTransaction:()=>false}),409);
  await rejects(access("other").appendInTransaction(packageId,body(),session),404);
  await rejects(access("other").get(packageId),404); await rejects(x.get("bad"),400); assert.equal(calls.writes,0);
});
test("corrupt persisted ledgers fail instead of showing a false zero", () => {
  const p={id:id(100),requestId:id(10),amount:300};
  for(const payments of [null,[{...p,amount:-1}],[{...p,amount:761}],[p,p],[{...p,id:"bad"}]]) assert.throws(()=>paymentSummary({amount:760,payments}),{statusCode:409});
});
