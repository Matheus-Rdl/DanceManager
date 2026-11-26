import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPlanFields, updatePlanFields, planListFilters } from "../../src/modules/privateLessonPlans/privateLessonPlansRules.js";
import DataAccess from "../../src/modules/privateLessonPlans/privateLessonPlansDataAccess.js";
import Controllers from "../../src/modules/privateLessonPlans/privateLessonPlansControllers.js";
import { privateLessonPlansAccessGate } from "../../src/modules/privateLessonPlans/privateLessonPlansAccess.js";

const input = { name: "4 aulas", lessonCount: 4, amount: 760 };
const timestamp = "2026-11-26T15:00:00.000Z";
const clone = x => structuredClone(x);
const matches = (row, query) => Object.entries(query).every(([key, value]) => row[key] === value);
const duplicate = () => Object.assign(new Error("duplicate"), { code: 11000 });

/* EN: In-memory persistence double implements the query and unique-index contract used by this service.
   PT: Simulador em memória implementa o contrato de consultas e unicidade usado pelo serviço. */
function fixture() {
  const rows = [];
  let conflict = false;
  const model = {
    find(query) { return { sort: spec => ({ lean: async () => clone(rows.filter(r => matches(r, query)).sort((a, b) => {
      for (const [key, dir] of Object.entries(spec)) {
        if (a[key] < b[key]) return -dir;
        if (a[key] > b[key]) return dir;
      }
      return 0;
    })) }) }; },
    findOne(query) { return { lean: async () => clone(rows.find(r => matches(r, query)) ?? null) }; },
    async create(data) {
      if (rows.some(r => r.schoolId === data.schoolId && r.nameKey === data.nameKey)) throw duplicate();
      const row = { ...clone(data), __v: 0 };
      rows.push(row);
      return { toObject: () => clone(row) };
    },
    findOneAndUpdate(query, update, options) {
      assert.deepEqual(options, { new: true, runValidators: true });
      assert.equal(update.$inc.__v, 1);
      assert.ok(Object.hasOwn(query, "__v"));
      return { lean: async () => {
        if (conflict) return null;
        const row = rows.find(r => matches(r, query));
        if (!row) return null;
        if (rows.some(r => r !== row && r.schoolId === row.schoolId && r.nameKey === update.$set.nameKey)) throw duplicate();
        Object.assign(row, clone(update.$set)); row.__v += update.$inc.__v;
        return clone(row);
      } };
    }
  };
  const api = (school = "default") => new Controllers(new DataAccess({ model, resolveSchoolId: () => school, clock: () => timestamp }));
  return { api, rows, forceConflict: () => { conflict = true; } };
}

test("normalizes names and validates positive counts and currency", () => {
  assert.deepEqual(createPlanFields({ ...input, name: "  Pacóte   4 aulas " }), { ...input, name: "Pacóte 4 aulas", nameKey: "pacote-4-aulas" });
  for (const amount of [0, -1, 1.001, "760", NaN, Infinity, Number.MAX_VALUE]) assert.throws(() => createPlanFields({ ...input, amount }), { statusCode: 400 });
  for (const lessonCount of [0, -1, 1.2, "4", Infinity]) assert.throws(() => createPlanFields({ ...input, lessonCount }), { statusCode: 400 });
  for (const name of ["", " ", "!!!", "a".repeat(71), 123]) assert.throws(() => createPlanFields({ ...input, name }), { statusCode: 400 });
});
test("rejects server-owned fields and invalid partial edits", () => {
  for (const key of ["schoolId", "id", "nameKey", "createdAt", "__v", "$set", "active"]) assert.throws(() => createPlanFields({ ...input, [key]: true }), { statusCode: 400 });
  for (const body of [{}, null, [], { active: "false" }, { schoolId: "other" }, { amount: 0 }, { name: null }]) assert.throws(() => updatePlanFields(body), { statusCode: 400 });
  assert.deepEqual(updatePlanFields({ active: false, amount: 800 }), { active: false, amount: 800 });
});
test("validates filter without allowing scope overrides", () => {
  assert.deepEqual(planListFilters({}), {});
  assert.deepEqual(planListFilters({ active: "true" }), { active: true });
  assert.deepEqual(planListFilters({ active: "false" }), { active: false });
  for (const query of [{ active: "yes" }, { active: ["true", "false"] }, { schoolId: "other" }]) assert.throws(() => planListFilters(query), { statusCode: 400 });
});
test("creates, retrieves and edits a template with the API envelope", async () => {
  const { api } = fixture(); const c = api();
  const created = await c.create(input);
  assert.equal(created.statusCode, 201); assert.equal(created.success, true);
  const { id } = created.body;
  assert.equal(created.body.active, true); assert.equal(created.body.schoolId, "default");
  assert.equal((await c.get(id)).body.amount, 760);
  const changed = await c.update(id, { amount: 800, lessonCount: 5, name: "5 aulas" });
  assert.equal(changed.statusCode, 200); assert.equal(changed.body.amount, 800);
  assert.equal(changed.body.lessonCount, 5); assert.equal(changed.body.nameKey, "5-aulas"); assert.equal(changed.body.__v, 1);
  assert.equal(changed.body.createdAt, timestamp); assert.equal(changed.body.id, id);
});
test("deactivates and reactivates, filters and sorts without deleting", async () => {
  const { api, rows } = fixture(); const c = api();
  const four = (await c.create(input)).body;
  const one = (await c.create({ name: "1 aula", lessonCount: 1, amount: 200 })).body;
  assert.deepEqual((await c.list({})).body.map(r => r.id), [one.id, four.id]);
  assert.equal((await c.update(one.id, { active: false })).body.active, false);
  assert.deepEqual((await c.list({ active: "true" })).body.map(r => r.id), [four.id]);
  assert.deepEqual((await c.list({ active: "false" })).body.map(r => r.id), [one.id]);
  assert.equal(rows.length, 2);
  assert.equal((await c.update(one.id, { active: true })).body.active, true);
});
test("duplicate normalized names return 409 even when inactive; renaming also checks uniqueness", async () => {
  const { api } = fixture(); const c = api();
  const first = (await c.create({ ...input, name: "Pacóte" })).body;
  await c.update(first.id, { active: false });
  assert.equal((await c.create({ ...input, name: " PACOTE " })).statusCode, 409);
  const second = (await c.create(input)).body;
  assert.equal((await c.update(second.id, { name: "pacote" })).statusCode, 409);
});
test("isolates schools and handles missing/invalid IDs", async () => {
  const { api } = fixture(); const a = api(), b = api("other");
  const { id } = (await a.create(input)).body;
  assert.equal((await b.create(input)).statusCode, 201);
  assert.equal((await b.get(id)).statusCode, 404);
  assert.equal((await b.update(id, { active: false })).statusCode, 404);
  assert.equal((await b.list({})).body.length, 1);
  assert.equal((await a.get(randomUUID())).statusCode, 404);
  assert.equal((await a.get("invalid")).statusCode, 400);
  assert.equal((await a.update(id, { schoolId: "other" })).statusCode, 400);
  assert.equal((await a.get(id)).body.active, true);
});
test("rejects overlapping updates with 409", async () => {
  const { api, forceConflict } = fixture(); const c = api();
  const { id } = (await c.create(input)).body;
  forceConflict();
  assert.equal((await c.update(id, { amount: 800 })).statusCode, 409);
  assert.equal((await c.get(id)).body.amount, 760);
});
test("production gate fails closed until server authentication is available", () => {
  const previous = process.env.NODE_ENV;
  let code, response, next = 0;
  const res = { status(value) { code = value; return this; }, send(value) { response = value; } };
  try {
    process.env.NODE_ENV = "production";
    privateLessonPlansAccessGate({}, res, () => next++);
    assert.equal(code, 403); assert.equal(response.success, false); assert.equal(next, 0);
    process.env.NODE_ENV = "development";
    privateLessonPlansAccessGate({}, res, () => next++);
    assert.equal(next, 1);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});
