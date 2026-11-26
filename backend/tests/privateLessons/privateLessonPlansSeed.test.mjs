import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DEFAULT_PRIVATE_LESSON_PLANS, defaultPrivateLessonPlanId, seedPrivateLessonPlans } from "../../src/modules/privateLessonPlans/privateLessonPlansSeed.js";
import { validPlanId } from "../../src/modules/privateLessonPlans/privateLessonPlansRules.js";

const duplicate = () => Object.assign(new Error("duplicate"), { code: 11000 });
const clock = () => "2026-11-26T16:00:00.000Z";
function fixture() {
  const rows = [];
  let writes = 0;
  const model = {
    findOne(query) { return { lean: async () => structuredClone(rows.find(row => Object.entries(query).every(([k, v]) => row[k] === v)) ?? null) }; },
    async create(data) {
      writes++;
      if (rows.some(row => row.id === data.id || (row.schoolId === data.schoolId && row.nameKey === data.nameKey))) throw duplicate();
      const row = { ...structuredClone(data), __v: 0 };
      rows.push(row);
      return { toObject: () => structuredClone(row) };
    }
  };
  const run = (apply = false, schoolId = "default") => seedPrivateLessonPlans({ model, schoolId, apply, clock });
  return { rows, model, run, writes: () => writes };
}

test("default templates match approved values and UUIDs are stable and school-scoped", () => {
  assert.deepEqual(DEFAULT_PRIVATE_LESSON_PLANS.map(p => [p.lessonCount, p.amount]), [[1, 200], [4, 760], [10, 1800]]);
  const id = defaultPrivateLessonPlanId("default", "1-aula");
  assert.ok(validPlanId(id));
  assert.equal(id, defaultPrivateLessonPlanId("default", "1-aula"));
  assert.notEqual(id, defaultPrivateLessonPlanId("other", "1-aula"));
  assert.notEqual(id, defaultPrivateLessonPlanId("default", "4-aulas"));
});
test("simulation performs no writes", async () => {
  const f = fixture();
  assert.deepEqual((await f.run()).map(r => r.action), Array(3).fill("pending"));
  assert.equal(f.writes(), 0);
  assert.equal(f.rows.length, 0);
});
test("apply creates exactly three active records; subsequent runs preserve them", async () => {
  const f = fixture();
  assert.deepEqual((await f.run(true)).map(r => r.action), Array(3).fill("created"));
  assert.ok(f.rows.every(r => r.active && r.createdAt === clock() && r.updatedAt === clock() && r.schoolId === "default"));
  assert.equal(new Set(f.rows.map(r => r.id)).size, 3);
  const snapshot = structuredClone(f.rows);
  assert.deepEqual((await f.run(true)).map(r => r.action), Array(3).fill("preserved"));
  assert.deepEqual(f.rows, snapshot);
  assert.equal(f.writes(), 3);
});
test("price, count, rename and inactive status are preserved", async () => {
  const f = fixture();
  await f.run(true);
  Object.assign(f.rows[1], { name: "Pacote especial", nameKey: "pacote-especial", amount: 990, lessonCount: 5, active: false });
  const snapshot = structuredClone(f.rows);
  assert.equal((await f.run(true))[1].action, "preserved");
  assert.deepEqual(f.rows, snapshot);
});
test("matching manually created template is preserved without altering custom templates", async () => {
  const f = fixture();
  f.rows.push({ id: randomUUID(), schoolId: "default", nameKey: "4-aulas", name: "4 aulas", amount: 900, lessonCount: 4, active: false },
    { id: randomUUID(), schoolId: "default", nameKey: "extra", name: "Extra", amount: 500, lessonCount: 2, active: true });
  const snapshot = structuredClone(f.rows);
  assert.deepEqual((await f.run(true)).map(r => r.action), ["created", "preserved", "created"]);
  assert.deepEqual(f.rows.slice(0, 2), snapshot);
  assert.equal(f.rows.length, 4);
});
test("another school gets separate templates", async () => {
  const f = fixture();
  await f.run(true);
  await f.run(true, "another");
  assert.equal(f.rows.length, 6);
  assert.equal(new Set(f.rows.map(r => r.id)).size, 6);
});
test("concurrent seeds do not duplicate templates", async () => {
  const f = fixture();
  const outcomes = (await Promise.all([f.run(true), f.run(true)])).flat();
  assert.equal(outcomes.filter(r => r.action === "created").length, 3);
  assert.equal(outcomes.filter(r => r.action === "preserved").length, 3);
  assert.equal(f.rows.length, 3);
});
test("unrelated duplicate and database failure are not swallowed", async () => {
  const f = fixture();
  for (const err of [duplicate(), new Error("database unavailable")]) {
    f.model.create = async () => { throw err; };
    await assert.rejects(f.run(true), error => error === err);
  }
});
