import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrivateLessonPlansService } from "../src/services/privateLessonPlansServices.js";
import { buildPlanPayload, filterPlans, planForm } from "../src/features/settings/privateLessonPlansView.js";
const original = { id: "abc", name: "4 aulas", lessonCount: 4, amount: 760, active: true };
const form = { name: "  Pacote  especial ", lessonCount: "4", amount: "760,50", active: true };
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

test("create converts comma decimals and omits active and IDs", () => {
  assert.deepEqual(buildPlanPayload(form), { name: "Pacote especial", lessonCount: 4, amount: 760.5 });
});
test("rejects invalid names, quantities and prices", () => {
  for (const [key, values] of Object.entries({ name: ["", "!!!", "x".repeat(71)], lessonCount: ["0", "-1", "1.5", "1e2", "9007199254740992"], amount: ["", "0", "-1", "2.345", "1e3", "Infinity", "1.000,00"] })) {
    for (const value of values) assert.throws(() => buildPlanPayload({ ...form, [key]: value }));
  }
});
test("edit sends only changed fields, including false", () => {
  assert.deepEqual(buildPlanPayload({ ...planForm(original), active: false }, original), { active: false });
  assert.deepEqual(buildPlanPayload({ ...planForm(original), amount: "800" }, original), { amount: 800 });
  assert.deepEqual(buildPlanPayload(planForm(original), original), {});
});
test("filter combines case/accent-insensitive search and status", () => {
  const rows = [original, { ...original, id: "def", name: "Dança", active: false }];
  assert.deepEqual(filterPlans(rows, " DANCA ", "inactive"), [rows[1]]);
  assert.deepEqual(filterPlans(rows, "danca", "active"), []);
  assert.deepEqual(filterPlans(rows, "", "all"), rows);
});
test("list unwraps API and passes filters and abort signal", async () => {
  const signal = new AbortController().signal;
  const api = createPrivateLessonPlansService({ base: "http://localhost:4000/", fetcher: async (url, options) => {
    assert.equal(url, "http://localhost:4000/private-lesson-plans?active=false");
    assert.equal(options.method, "GET"); assert.equal(options.signal, signal);
    return response({ success: true, body: [original] });
  } });
  assert.deepEqual(await api.list({ active: false, signal }), [original]);
});
test("create sends only JSON data by POST", async () => {
  const data = buildPlanPayload(form);
  const api = createPrivateLessonPlansService({ base: "http://local", fetcher: async (url, options) => {
    assert.equal(url, "http://local/private-lesson-plans"); assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json"); assert.deepEqual(JSON.parse(options.body), data);
    return response({ success: true, body: original }, 201);
  } });
  assert.deepEqual(await api.create(data), original);
});
test("update uses encoded id, PATCH and false status", async () => {
  const api = createPrivateLessonPlansService({ base: "http://local", fetcher: async (url, options) => {
    assert.equal(url, "http://local/private-lesson-plans/a%2Fb"); assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body), { active: false }); return response({ body: original });
  } });
  await api.update("a/b", { active: false });
});
test("API errors including production gate are not hidden", async () => {
  for (const status of [403, 409, 200]) {
    const api = createPrivateLessonPlansService({ fetcher: async () => response({ success: false, body: "Erro do servidor" }, status) });
    await assert.rejects(api.list(), /Erro do servidor/);
  }
});
test("reject malformed JSON and invalid list response", async () => {
  const api = createPrivateLessonPlansService({ fetcher: async () => response({ body: {} }) });
  await assert.rejects(api.list(), /Lista de pacotes inválida/);
  const bad = createPrivateLessonPlansService({ fetcher: async () => ({ ok: false, status: 500, json: async () => { throw new SyntaxError(); } }) });
  await assert.rejects(bad.list(), /Resposta inválida/);
});
