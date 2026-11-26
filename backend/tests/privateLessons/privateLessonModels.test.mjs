import test from "node:test";
import assert from "node:assert/strict";
import PrivateLessonPlan from "../../src/models/PrivateLessonPlan.js";
import PrivateLessonPackage from "../../src/models/PrivateLessonPackage.js";
import PrivateLesson from "../../src/models/PrivateLesson.js";
import Revenue from "../../src/models/Revenue.js";
import { privateLessonRevenueFields } from "../../src/modules/privateLessonPayments/privateLessonRevenueIntegration.js";

const now = "2026-11-26T15:00:00.000Z";
const base = { id: "test-id", schoolId: "default", createdAt: now, updatedAt: now };
const participants = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"];
const plan = { ...base, name: "4 aulas", nameKey: "4-aulas", lessonCount: 4, amount: 760 };
const pkg = { ...base, planId: "plan-id", name: "4 aulas", participantIds: participants, lessonCount: 4, amount: 760, contractedOn: "2026-11-26" };
const lesson = { ...base, packageId: "package-id", startsAt: "2026-12-01T17:00:00.000Z", endsAt: "2026-12-01T18:00:00.000Z" };
const error = (Model, data, field) => assert.ok(new Model(data).validateSync()?.errors[field], `Expected validation error: ${field}`);

test("plan validates, has correct collection and school/name unique index", () => {
  const doc = new PrivateLessonPlan(plan);
  assert.equal(doc.validateSync(), undefined);
  assert.equal(doc.active, true);
  assert.equal(PrivateLessonPlan.collection.name, "privateLessonPlans");
  assert.ok(PrivateLessonPlan.schema.indexes().some(([key, opts]) => key.schoolId === 1 && key.nameKey === 1 && opts.unique));
  error(PrivateLessonPlan, { ...plan, lessonCount: 2.5 }, "lessonCount");
  error(PrivateLessonPlan, { ...plan, amount: 1.001 }, "amount");
});
test("package shares one purchase with any number of distinct users", () => {
  const doc = new PrivateLessonPackage(pkg);
  assert.equal(doc.validateSync(), undefined);
  assert.equal(doc.status, "active");
  assert.equal(doc.participantIds.length, 3);
  assert.equal(PrivateLessonPackage.collection.name, "privateLessonPackages");
  assert.equal(new PrivateLessonPackage({ ...pkg, planId: null, lessonCount: 6, amount: 1000 }).validateSync(), undefined);
  error(PrivateLessonPackage, { ...pkg, participantIds: [] }, "participantIds");
  error(PrivateLessonPackage, { ...pkg, participantIds: [participants[0], participants[0].toUpperCase()] }, "participantIds");
  error(PrivateLessonPackage, { ...pkg, participantIds: ["000052"] }, "participantIds");
  error(PrivateLessonPackage, { ...pkg, contractedOn: "2026-02-30" }, "contractedOn");
  error(PrivateLessonPackage, { ...pkg, status: "paid" }, "status");
  assert.equal(PrivateLessonPackage.schema.path("dueDate"), undefined);
  assert.equal(PrivateLessonPackage.schema.path("expiresAt"), undefined);
});
test("lesson validates its interval and supports reschedulable absences", () => {
  const doc = new PrivateLesson(lesson);
  assert.equal(doc.validateSync(), undefined);
  assert.equal(doc.status, "scheduled");
  assert.equal(PrivateLesson.collection.name, "privateLessons");
  for (const status of ["completed", "absent", "cancelled"]) assert.equal(new PrivateLesson({ ...lesson, status }).validateSync(), undefined);
  error(PrivateLesson, { ...lesson, endsAt: lesson.startsAt }, "endsAt");
  error(PrivateLesson, { ...lesson, startsAt: "2026-12-01 14:00" }, "startsAt");
  error(PrivateLesson, { ...lesson, status: "paid" }, "status");
  assert.equal(PrivateLesson.schema.path("teacherId"), undefined);
});

test("embedded receipt validates and existing packages default to no payments", () => {
  const receipt = { id: "00000000-0000-4000-8000-000000000001", requestId: "00000000-0000-4000-8000-000000000002",
    accountId: "00000000-0000-4000-8000-000000000003", amount: 300, receivedAt: "2026-11-26", method: "Pix", createdAt: now };
  assert.equal(new PrivateLessonPackage(pkg).payments.length, 0);
  assert.equal(new PrivateLessonPackage({ ...pkg, payments: [receipt] }).validateSync(), undefined);
  for (const invalid of [{ amount: -1 }, { amount: 0.001 }, { accountId: "bad" }, { receivedAt: "2026-02-30" }]) {
    assert.ok(new PrivateLessonPackage({ ...pkg, payments: [{ ...receipt, ...invalid }] }).validateSync());
  }
});

test("integrated revenue validates against the existing schema and unique source index", () => {
  const receipt = { id: "00000000-0000-4000-8000-000000000001", amount: 300,
    accountId: "00000000-0000-4000-8000-000000000003", receivedAt: "2026-11-26", method: "Pix", notes: "", createdAt: now };
  const fields = privateLessonRevenueFields("default", pkg.id, receipt, pkg.name);
  assert.equal(new Revenue(fields).validateSync(), undefined);
  assert.ok(Revenue.schema.indexes().some(([key, opts]) => key.schoolId === 1 && key.sourceType === 1 && key.sourceId === 1 && opts.unique));
});
