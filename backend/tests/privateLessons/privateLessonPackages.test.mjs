import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPackageFields, participantFilter } from "../../src/modules/privateLessonPackages/privateLessonPackagesRules.js";
import DataAccess from "../../src/modules/privateLessonPackages/privateLessonPackagesDataAccess.js";
import Controllers from "../../src/modules/privateLessonPackages/privateLessonPackagesControllers.js";
import { privateLessonPackagesAccessGate } from "../../src/modules/privateLessonPackages/privateLessonPackagesAccess.js";

const ids = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"];
const foreign = "507f1f77bcf86cd799439014";
const planId = randomUUID();
const timestamp = "2026-11-26T15:00:00.000Z";
const standard = { planId, participantIds: ids, contractedOn: "2026-11-26", notes: "  Casal e convidado  " };
const custom = { planId: null, participantIds: [ids[0]], contractedOn: "2026-11-26", name: "6 aulas", lessonCount: 6, amount: 1050.50 };
const clone = x => structuredClone(x);

/* EN: In-memory models test the service's query contract without MongoDB.
   PT: Models em memória testam o contrato de consultas do serviço sem MongoDB. */
function fixture() {
  const rows = [];
  const plans = [{ id: planId, schoolId: "default", name: "4 aulas", lessonCount: 4, amount: 760, active: true }];
  const users = [{ _id: ids[0] }, { _id: ids[1], schoolId: "default" }, { _id: ids[2] }, { _id: foreign, schoolId: "other" }];
  const model = { async create(data) { rows.push(clone(data)); return { toObject: () => clone(data) }; } };
  const planModel = { findOne(filter) { return { lean: async () => clone(plans.find(p => p.id === filter.id && p.schoolId === filter.schoolId) ?? null) }; } };
  const userModel = { find(filter) { return { setOptions(options) { assert.equal(options.strictQuery, false); return this; }, select(fields) { assert.equal(fields, "_id"); return this; }, async lean() {
    return clone(users.filter(u => filter._id.$in.includes(u._id) && (filter.$or ? u.schoolId === "default" || !Object.hasOwn(u, "schoolId") : u.schoolId === filter.schoolId)));
  } }; } };
  const api = (school = "default") => new Controllers(new DataAccess({ model, planModel, userModel, resolveSchoolId: () => school, clock: () => timestamp }));
  return { rows, plans, users, api };
}

test("normalizes participants and notes, allows more than two participants", () => {
  const result = createPackageFields({ ...standard, participantIds: [ids[0].toUpperCase(), ...ids.slice(1)] });
  assert.deepEqual(result.participantIds, ids); assert.equal(result.notes, "Casal e convidado");
});
test("rejects empty, repeated, malformed and non-string participants", () => {
  for (const participantIds of [[], [ids[0], ids[0].toUpperCase()], ["123456"], [123], null, ids[0]]) {
    assert.throws(() => createPackageFields({ ...standard, participantIds }), { statusCode: 400 });
  }
});
test("rejects invalid dates, notes, identifiers and server-owned fields", () => {
  for (const changes of [{ contractedOn: "2026-02-30" }, { notes: null }, { notes: "x".repeat(1001) }, { planId: "" }, { status: "completed" }, { schoolId: "other" }, { received: 760 }, { paidAmount: 760 }, { id: randomUUID() }]) {
    assert.throws(() => createPackageFields({ ...standard, ...changes }), { statusCode: 400 });
  }
});
test("rejects custom overrides on standard packages", () => {
  for (const fields of [{ amount: 1 }, { name: "Novo" }, { lessonCount: 1 }]) assert.throws(() => createPackageFields({ ...standard, ...fields }), { statusCode: 400 });
});
test("validates custom package fields strictly", () => {
  for (const changes of [{ amount: 0 }, { amount: 1.001 }, { amount: "760" }, { lessonCount: 0 }, { lessonCount: 1.5 }, { name: " " }]) assert.throws(() => createPackageFields({ ...custom, ...changes }), { statusCode: 400 });
  assert.equal(createPackageFields(custom).amount, 1050.5);
});
test("creates a single standard purchase with a template snapshot", async () => {
  const { api, rows } = fixture(); const result = await api().create(standard);
  assert.equal(result.statusCode, 201); assert.equal(result.success, true); assert.equal(rows.length, 1);
  assert.deepEqual(result.body.participantIds, ids); assert.equal(result.body.amount, 760); assert.equal(result.body.lessonCount, 4);
  assert.equal(result.body.status, "active"); assert.equal(result.body.createdAt, timestamp); assert.equal(result.body.schoolId, "default");
  assert.ok(!Object.hasOwn(result.body, "paidAmount"));
});
test("subsequent template edits leave the prior purchase unchanged and permit another purchase", async () => {
  const { api, rows, plans } = fixture(); const c = api(); const first = await c.create(standard);
  Object.assign(plans[0], { amount: 800, lessonCount: 5, name: "5 aulas" });
  const second = await c.create(standard);
  assert.equal(second.statusCode, 201); assert.notEqual(first.body.id, second.body.id); assert.equal(rows.length, 2);
  assert.equal(rows[0].amount, 760); assert.equal(rows[0].lessonCount, 4); assert.equal(rows[0].name, "4 aulas");
  assert.equal(rows[1].amount, 800); assert.equal(rows[1].lessonCount, 5);
});
test("creates custom purchases without a plan lookup", async () => {
  const { api, plans } = fixture(); plans.length = 0; const result = await api().create(custom);
  assert.equal(result.statusCode, 201); assert.equal(result.body.planId, null); assert.equal(result.body.amount, 1050.5);
});
test("missing or foreign users reject the entire purchase", async () => {
  const { api, rows } = fixture();
  for (const id of [foreign, "507f1f77bcf86cd799439099"]) assert.equal((await api().create({ ...standard, participantIds: [ids[0], id] })).statusCode, 404);
  assert.equal(rows.length, 0);
});
test("inactive or missing templates cannot be purchased", async () => {
  const { api, rows, plans } = fixture(); plans[0].active = false;
  assert.equal((await api().create(standard)).statusCode, 409);
  assert.equal((await api().create({ ...standard, planId: randomUUID() })).statusCode, 404); assert.equal(rows.length, 0);
});
test("non-default schools require explicit user ownership and cannot access foreign templates", async () => {
  const { api, rows } = fixture(); const c = api("other");
  assert.equal((await c.create(custom)).statusCode, 404);
  assert.equal((await c.create({ ...standard, participantIds: [foreign] })).statusCode, 404);
  assert.equal((await c.create({ ...custom, participantIds: [foreign] })).statusCode, 201);
  assert.equal(rows[0].schoolId, "other");
  assert.deepEqual(participantFilter("other", [foreign]), { _id: { $in: [foreign] }, schoolId: "other" });
});
test("production access remains blocked; development continues", () => {
  const previous = process.env.NODE_ENV;
  let next = 0, status;
  const res = { status(code) { status = code; return this; }, send(body) { assert.equal(body.success, false); } };
  try {
    process.env.NODE_ENV = "production"; privateLessonPackagesAccessGate({}, res, () => next++); assert.equal(status, 403); assert.equal(next, 0);
    process.env.NODE_ENV = "development"; privateLessonPackagesAccessGate({}, res, () => next++); assert.equal(next, 1);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
