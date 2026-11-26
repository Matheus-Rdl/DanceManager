import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { packageListFilters, updatePackageFields } from "../../src/modules/privateLessonPackages/privateLessonPackagesRules.js";
import DataAccess from "../../src/modules/privateLessonPackages/privateLessonPackagesDataAccess.js";
import Controllers from "../../src/modules/privateLessonPackages/privateLessonPackagesControllers.js";

const a = "507f1f77bcf86cd799439011", b = "507f1f77bcf86cd799439012", c = "507f1f77bcf86cd799439013";
const first = randomUUID(), second = randomUUID(), other = randomUUID();
const base = { planId: randomUUID(), name: "4 aulas", lessonCount: 4, amount: 760, status: "active", notes: "", __v: 0, createdAt: "2026-11-20T12:00:00.000Z" };
const clone = structuredClone;
/* EN: In-memory query doubles only; no credentials or database connection.
   PT: Simuladores de consultas em memória; sem credenciais ou conexão com banco. */
function fixture() {
  const rows = [
    { ...base, id: first, schoolId: "default", participantIds: [a,b], contractedOn: "2026-11-20" },
    { ...base, id: second, schoolId: "default", participantIds: [a,c], status: "completed", contractedOn: "2026-11-21" },
    { ...base, id: other, schoolId: "other", participantIds: [c], contractedOn: "2026-11-22" }
  ];
  const users = [{ _id: a, user_name: "Aluno A", user_mat: "000001", user_cpf: "secret" }, { _id: b, schoolId: "default", user_name: "Aluno B" }, { _id: c, schoolId: "other", user_name: "Aluno C" }];
  const calls = { users: 0, writes: 0, race: false };
  const lessons = [];
  const lessonModel = { async exists(q) { return lessons.find(l => l.schoolId === q.schoolId && l.packageId === q.packageId) ?? null; } };
  const matches = (r, f) => Object.entries(f).every(([key, v]) => {
    if (key === "participantIds") return r[key].includes(v);
    if (key === "contractedOn") return (!v.$gte || r[key] >= v.$gte) && (!v.$lte || r[key] <= v.$lte);
    return r[key] === v;
  });
  const model = {
    find(f) { return { sort(s) { assert.deepEqual(s, { contractedOn: -1, createdAt: -1, id: 1 }); return this; }, async lean() { return clone(rows.filter(r => matches(r,f)).sort((a,b) => b.contractedOn.localeCompare(a.contractedOn))); } }; },
    findOne(f) { return { async lean() { return clone(rows.find(r => matches(r,f)) ?? null); } }; },
    findOneAndUpdate(f, u, opts) { return { async lean() {
      assert.deepEqual(opts, { new: true, runValidators: true });
      if (calls.race) return null;
      const r = rows.find(r => matches(r,f)); if (!r) return null;
      calls.writes++; Object.assign(r,u.$set); r.__v += u.$inc.__v; return clone(r);
    } }; }
  };
  const userModel = { find(f) { calls.users++; return { setOptions(o) { assert.deepEqual(o,{strictQuery:false}); return this; }, select(s) { assert.equal(s,"_id user_name user_mat"); return this; }, async lean() { return clone(users.filter(u => f._id.$in.includes(u._id) && (f.$or ? !Object.hasOwn(u,"schoolId") || u.schoolId === "default" : u.schoolId === f.schoolId))); } }; } };
  const api = (school = "default") => new Controllers(new DataAccess({ model, lessonModel, userModel, resolveSchoolId: () => school, clock: () => "2026-11-26T12:00:00.000Z" }));
  return { rows, calls, api, lessons };
}

test("validates all supported filters and inclusive date range", () => {
  assert.deepEqual(packageListFilters({participantId:a.toUpperCase(),status:"active",from:"2026-11-20",to:"2026-11-20"}),{participantIds:a,status:"active",contractedOn:{$gte:"2026-11-20",$lte:"2026-11-20"}});
  assert.deepEqual(packageListFilters({}),{});
});
test("rejects invalid filters and Mongo operators", () => {
  for (const f of [{schoolId:"other"},{participantId:{$ne:null}},{participantId:[a]},{status:["active"]},{status:"paid"},{from:"2026-02-30"},{from:"2026-11-22",to:"2026-11-20"},{to:""},null]) assert.throws(()=>packageListFilters(f),{statusCode:400});
});
test("lists school packages ordered by date and enriches names with a single query", async () => {
  const {api,calls}=fixture(); const result=await api().list({}); assert.equal(result.statusCode,200);
  assert.deepEqual(result.body.map(r=>r.id),[second,first]); assert.equal(calls.users,1);
  assert.deepEqual(result.body[1].participants[0],{id:a,name:"Aluno A",registration:"000001",available:true});
  assert.deepEqual(result.body[0].participants[1],{id:c,name:null,registration:null,available:false});
  assert.equal(calls.writes,0);
});
test("both participants see the same purchase and combined filters work", async () => {
  const {api}=fixture(); const x=api();
  const one=await x.list({participantId:a,status:"active",from:"2026-11-20",to:"2026-11-20"});
  const two=await x.list({participantId:b});
  assert.equal(one.body.length,1); assert.equal(two.body[0].id,one.body[0].id);
});
test("empty results do not query users", async () => {
  const {api,calls}=fixture(); assert.deepEqual((await api().list({status:"cancelled"})).body,[]); assert.equal(calls.users,0);
});
test("detail is school scoped and validates IDs", async () => {
  const {api}=fixture(); assert.equal((await api().get(first)).statusCode,200);
  assert.equal((await api().get(other)).statusCode,404); assert.equal((await api().get("bad")).statusCode,400);
  assert.equal((await api("other").get(other)).body.participants[0].name,"Aluno C");
});
test("only notes and date can be changed with a valid client version", () => {
  assert.deepEqual(updatePackageFields({version:0,notes:"  Correção  ",contractedOn:"2026-11-20"}),{version:0,fields:{notes:"Correção",contractedOn:"2026-11-20"}});
  for (const p of [{amount:1},{lessonCount:2},{participantIds:[a]},{name:"Novo"},{planId:null},{status:"cancelled"},{schoolId:"other"},{paidAmount:10},{notes:null},{notes:"x".repeat(1001)},{contractedOn:"2026-02-30"},{}]) assert.throws(()=>updatePackageFields({version:0,...p}),{statusCode:400});
  for (const version of [undefined,-1,0.1,"0"]) assert.throws(()=>updatePackageFields({version,notes:"ok"}),{statusCode:400});
});
test("edit preserves snapshot and participants, increments version", async () => {
  const {api,rows,calls}=fixture(); const before=clone(rows[0]); const r=await api().update(first,{version:0,notes:"  Nova nota  ",contractedOn:"2026-11-19"});
  assert.equal(r.statusCode,200); assert.equal(r.body.notes,"Nova nota"); assert.equal(r.body.__v,1); assert.equal(calls.writes,1);
  assert.deepEqual(rows[0],{...before,notes:"Nova nota",contractedOn:"2026-11-19",__v:1,updatedAt:"2026-11-26T12:00:00.000Z"});
});
test("blocks stale client versions and concurrent writes", async () => {
  const {api,calls}=fixture(); const x=api(); assert.equal((await x.update(first,{version:1,notes:"x"})).statusCode,409);
  calls.race=true; assert.equal((await x.update(first,{version:0,notes:"x"})).statusCode,409); assert.equal(calls.writes,0);
});
test("blocks date change for non-active packages but allows notes", async () => {
  const {api}=fixture(); const x=api(); assert.equal((await x.update(second,{version:0,contractedOn:"2026-11-20"})).statusCode,409);
  assert.equal((await x.update(second,{version:0,notes:"Histórico"})).statusCode,200);
});
test("foreign or invalid IDs cannot be updated", async () => {
  const {api,calls}=fixture(); const x=api(); assert.equal((await x.update(other,{version:0,notes:"x"})).statusCode,404);
  assert.equal((await x.update("invalid",{version:0,notes:"x"})).statusCode,400); assert.equal(calls.writes,0);
});
test("purchase date is immutable after receiving money; notes remain editable", async () => {
  const {api,rows,calls}=fixture(); rows[0].payments=[{amount:300}];
  assert.equal((await api().update(first,{version:0,contractedOn:"2026-11-19"})).statusCode,409);
  assert.equal(calls.writes,0);
  assert.equal((await api().update(first,{version:0,notes:"Pagamento confirmado"})).statusCode,200);
});
test("list returns one derived summary per purchase without receipt details or writes", async () => {
  const {api,rows,calls}=fixture();
  rows[0].payments=[{id:randomUUID(),requestId:randomUUID(),amount:300,notes:"private"}];
  const result=await api().list({participantId:a});
  assert.equal(result.statusCode,200);
  const row=result.body.find(r=>r.id===first);
  assert.deepEqual(row.financial,{contractedAmount:760,paidAmount:300,outstandingAmount:460,paymentStatus:"partial",paymentCount:1});
  assert.equal(Object.hasOwn(row,"payments"),false);
  assert.equal(result.body.find(r=>r.id===second).financial.paymentStatus,"pending");
  assert.equal(calls.users,1);assert.equal(calls.writes,0);
  assert.equal((await api().get(first)).body.payments.length,1);
});
test("list rejects inconsistent stored receipts instead of reporting a false balance", async () => {
  const {api,rows,calls}=fixture(); rows[0].payments=[{id:randomUUID(),requestId:randomUUID(),amount:800}];
  assert.equal((await api().list({})).statusCode,409);assert.equal(calls.writes,0);
});

test("purchase date is immutable after scheduling; notes remain editable", async () => {
  const {api,lessons,calls}=fixture(); lessons.push({schoolId:"default",packageId:first});
  assert.equal((await api().update(first,{version:0,contractedOn:"2026-11-19"})).statusCode,409);
  assert.equal(calls.writes,0);
  assert.equal((await api().update(first,{version:0,notes:"Agendada"})).statusCode,200);
});
