import test from "node:test";
import assert from "node:assert/strict";
import { scheduleFields, lessonSummary, scheduleBatchFields, findScheduleConflicts } from "../../src/modules/privateLessons/privateLessonsRules.js";
import Controllers from "../../src/modules/privateLessonPackages/privateLessonPackagesControllers.js";
import DataAccess from "../../src/modules/privateLessons/privateLessonsDataAccess.js";
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const packageId = id(1), start = "2026-11-26T17:00:00.000Z";
const body = (n=10, extra={}) => ({requestId:id(n),startsAt:start,...extra});
const clone=structuredClone;
/* EN: Transactional in-memory double: no Mongoose, environment variables or database connections.
   PT: Simulador transacional em memória: sem Mongoose, variáveis de ambiente ou conexões ao banco. */
function fixture() {
  let state={pkg:{id:packageId,schoolId:"default",status:"active",contractedOn:"2026-11-26",lessonCount:4,participantIds:["a","b","c"],payments:[],__v:0},lessons:[],calendarVersion:0};
  let draft, active=false;
  const calls={ended:0,creates:0,locks:0,failWrite:false,failLock:false,failTransaction:false,retry:false,failCalendarLock:false};
  const session={async withTransaction(fn,opts){assert.deepEqual(opts,{readConcern:{level:"snapshot"},writeConcern:{w:"majority"}});if(calls.failTransaction)throw Error("unsupported");active=true;try{draft=clone(state);await fn();if(calls.retry){draft=clone(state);await fn();}state=draft;}finally{active=false;draft=undefined;}},async endSession(){calls.ended++;}};
  const match=(r,q)=>r&&Object.entries(q).every(([k,v])=>(v && typeof v === "object" ? (v.$in ? v.$in.includes(r[k]) : v.$lt !== undefined ? r[k]<v.$lt : r[k]>v.$gt) : r[k]===v));
  const query=fn=>({session(s){assert.equal(s,session);assert.equal(active,true);return this;},sort(s){assert.deepEqual(s,{startsAt:1,id:1});return this;},async lean(){return clone(fn());}});
  const current=()=>active?draft:state;
  const packageModel={db:{async startSession(){return session;}},findOne(q){return query(()=>match(current().pkg,q)?current().pkg:null);},findOneAndUpdate(q,u,o){assert.equal(active,true);assert.equal(o.session,session);return query(()=>{if(calls.failLock||!match(draft.pkg,q))return null;calls.locks++;draft.pkg.__v+=u.$inc.__v;Object.assign(draft.pkg,u.$set);return draft.pkg;});}};
  const calendarLockModel={async updateOne(q,u,o){assert.equal(active,true);assert.equal(o.session,session);assert.equal(o.upsert,true);assert.deepEqual(q,{_id:"default" === q._id ? "default" : "other"});if(calls.failCalendarLock)throw Error("calendar lock failed");draft.calendarVersion+=u.$inc.version;}};
  const lessonModel={find(q){return query(()=>{if(q.status)assert.ok(draft.calendarVersion>state.calendarVersion);return current().lessons.filter(l=>match(l,q)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));});},async create(rows,o){assert.equal(active,true);assert.equal(o.session,session);calls.creates++;if(calls.failWrite)throw Error("write failed");draft.lessons.push(...clone(rows));return rows.map(row=>({toObject:()=>clone(row)}));}};
  return {state:()=>state,calls,access:(school="default")=>new DataAccess({packageModel,lessonModel,calendarLockModel,resolveSchoolId:()=>school,clock:()=>new Date("2026-11-26T15:00:00Z")})};
}
const existing=(n,status,extra={})=>({id:id(n),schoolId:"default",packageId,startsAt:start,endsAt:"2026-11-26T18:00:00.000Z",notes:"",status,...extra});
test("default one hour, custom duration and trimmed notes",()=>{
  assert.deepEqual(scheduleFields(body()),{id:id(10),startsAt:start,endsAt:"2026-11-26T18:00:00.000Z",notes:""});
  assert.equal(scheduleFields(body(10,{endsAt:"2026-11-26T18:30:00.000Z",notes:"  ok  "})).notes,"ok");
});
test("reject invalid UTC dates, intervals, UUIDs and privileged fields",()=>{
  for(const extra of [{requestId:"x"},{startsAt:"2026-02-30T17:00:00.000Z"},{startsAt:"2026-11-26T14:00:00-03:00"},{endsAt:start},{endsAt:"2026-11-26T16:00:00.000Z"},{notes:1},{notes:"x".repeat(1001)},{status:"completed"},{schoolId:"other"},{teacherId:"x"},{participantIds:["x"]}])assert.throws(()=>scheduleFields(body(10,extra)),{statusCode:400});
});
test("scheduled reserves, completed consumes, absence and cancellation release credits",()=>{
  const rows=[existing(2,"completed"),existing(3,"scheduled"),existing(4,"absent"),existing(5,"cancelled")];
  assert.deepEqual(lessonSummary({lessonCount:4,status:"active"},rows),{lessonCount:4,scheduledCount:1,completedCount:1,absentCount:1,cancelledCount:1,remainingCount:3,availableToSchedule:2});
  assert.equal(lessonSummary({lessonCount:4,status:"cancelled"},rows).availableToSchedule,0);
});
test("invalid stored histories fail closed",()=>{
  for(const rows of [[existing(2,"completed"),existing(2,"scheduled")],[existing(3,"bad")],[existing(3,"scheduled"),existing(4,"completed")]])assert.throws(()=>lessonSummary({lessonCount:1,status:"active"},rows),{statusCode:409});
});
test("one shared scheduled lesson, even with unpaid package and multiple participants",async()=>{
  const f=fixture(),r=await f.access().schedule(packageId,body());assert.equal(r.lesson.status,"scheduled");assert.equal(r.summary.availableToSchedule,3);assert.equal(r.summary.remainingCount,4);assert.equal(f.state().lessons.length,1);assert.equal(f.state().pkg.payments.length,0);assert.equal(f.state().pkg.__v,1);assert.equal(f.calls.ended,1);assert.equal(Object.hasOwn(r.lesson,"teacherId"),false);
});
test("four reservations fill package; fifth blocked",async()=>{
  const f=fixture(),x=f.access();for(let n=10;n<14;n++)await x.schedule(packageId,body(n,{allowConflicts:true}));await assert.rejects(x.schedule(packageId,body(14)),{statusCode:409});assert.equal(f.state().lessons.length,4);assert.equal(f.state().pkg.__v,4);
});
test("completed lessons occupy credits, absences do not",async()=>{
  const f=fixture();f.state().pkg.lessonCount=2;f.state().lessons.push(existing(2,"completed"),existing(3,"absent"),existing(4,"cancelled"));const r=await f.access().schedule(packageId,body(10,{allowConflicts:true}));assert.equal(r.summary.availableToSchedule,0);assert.equal(r.summary.remainingCount,1);
});
test("replay returns original lesson even with no remaining slots",async()=>{
  const f=fixture(),x=f.access();f.state().pkg.lessonCount=1;const a=await x.schedule(packageId,body());const b=await x.schedule(packageId,body());assert.equal(b.replayed,true);assert.deepEqual(a.lesson,b.lesson);assert.equal(f.calls.creates,1);await assert.rejects(x.schedule(packageId,body(10,{notes:"changed"})),{statusCode:409});
});
test("cannot schedule before purchase date in Sao Paulo, including UTC midnight",async()=>{
  const f=fixture();await assert.rejects(f.access().schedule(packageId,body(10,{startsAt:"2026-11-26T02:59:00.000Z"})),{statusCode:400});assert.equal(f.calls.creates,0);await f.access().schedule(packageId,body(11,{startsAt:"2026-11-26T03:00:00.000Z"}));
});
test("inactive and cross-school packages rejected; listing scoped and read only",async()=>{
  const f=fixture();for(const status of ["completed","cancelled"]){f.state().pkg.status=status;await assert.rejects(f.access().schedule(packageId,body()),{statusCode:409});}await assert.rejects(f.access("other").schedule(packageId,body()),{statusCode:404});await assert.rejects(f.access("other").list(packageId),{statusCode:404});assert.equal(f.calls.creates,0);
  f.state().lessons.push(existing(2,"completed"),existing(3,"scheduled",{startsAt:"2026-11-26T16:00:00.000Z"}),existing(4,"scheduled",{schoolId:"other"}));const result=await f.access().list(packageId);assert.deepEqual(result.lessons.map(l=>l.id),[id(3),id(2)]);assert.equal(result.availableToSchedule,0);assert.equal(f.calls.locks,0);
});
test("write or lock failure rolls back all changes and ends session",async()=>{
  for(const flag of ["failWrite","failLock","failTransaction","failCalendarLock"]){const f=fixture();f.calls[flag]=true;await assert.rejects(f.access().schedule(packageId,body()));assert.equal(f.state().pkg.__v,0);assert.equal(f.state().lessons.length,0);assert.equal(f.state().calendarVersion,0);assert.equal(f.calls.ended,1);}
});
test("transaction retry commits just one lesson",async()=>{
  const f=fixture();f.calls.retry=true;await f.access().schedule(packageId,body());assert.equal(f.calls.creates,2);assert.equal(f.state().lessons.length,1);assert.equal(f.state().pkg.__v,1);
});

test("weekly series preserves duration, uses stable IDs and validates count and confirmation",()=>{
  const a=scheduleBatchFields(body(10,{count:4,endsAt:"2026-11-26T18:30:00.000Z"}),true);
  assert.deepEqual(a.rows.map(r=>r.startsAt),["2026-11-26T17:00:00.000Z","2026-12-03T17:00:00.000Z","2026-12-10T17:00:00.000Z","2026-12-17T17:00:00.000Z"]);
  assert.equal(a.rows[3].endsAt,"2026-12-17T18:30:00.000Z");assert.equal(new Set(a.rows.map(r=>r.id)).size,4);
  assert.deepEqual(a,scheduleBatchFields(body(10,{count:4,endsAt:"2026-11-26T18:30:00.000Z"}),true));
  for(const count of [0,1,101,2.5,"4",undefined])assert.throws(()=>scheduleBatchFields(body(10,{count}),true),{statusCode:400});
  assert.throws(()=>scheduleBatchFields(body(10,{allowConflicts:"true"})),{statusCode:400});
  assert.throws(()=>scheduleBatchFields(body(10,{count:4})),{statusCode:400});
});
test("school-wide conflicts return warning without writes; explicit confirmation permits overlap",async()=>{
  const f=fixture(),x=f.access();f.state().lessons.push(existing(2,"scheduled",{packageId:id(5)}));
  const api=new Controllers(null);const r=await api.execute(()=>x.schedule(packageId,body()));
  assert.equal(r.statusCode,409);assert.equal(r.code,"LESSON_SCHEDULE_CONFLICT");assert.equal(r.conflicts[0].packageId,id(5));
  assert.equal(f.state().lessons.length,1);assert.equal(f.state().pkg.__v,0);assert.equal(f.state().calendarVersion,0);
  const saved=await x.schedule(packageId,body(10,{allowConflicts:true}));assert.equal(saved.lesson.id,id(10));assert.equal(f.state().calendarVersion,1);
});
test("adjacent times, absent/cancelled lessons and another school are not conflicts",async()=>{
  const f=fixture();f.state().lessons.push(existing(2,"scheduled",{endsAt:start,startsAt:"2026-11-26T16:00:00.000Z"}),existing(3,"scheduled",{schoolId:"other"}),existing(4,"absent"),existing(5,"cancelled"));
  await f.access().schedule(packageId,body());assert.equal(f.state().lessons.length,5);
});
test("recurring conflict on second occurrence rolls back entire batch, confirmation and replay are safe",async()=>{
  const f=fixture(),x=f.access(),b=body(10,{count:4});
  f.state().lessons.push(existing(2,"completed",{packageId:id(5),startsAt:"2026-12-03T17:30:00.000Z",endsAt:"2026-12-03T18:30:00.000Z"}));
  await assert.rejects(x.scheduleRecurring(packageId,b),e=>e.code==="LESSON_SCHEDULE_CONFLICT"&&e.conflicts.length===1);
  assert.equal(f.state().lessons.length,1);assert.equal(f.state().calendarVersion,0);
  const result=await x.scheduleRecurring(packageId,{...b,allowConflicts:true});assert.equal(result.lessons.length,4);assert.equal(result.summary.availableToSchedule,0);
  const replay=await x.scheduleRecurring(packageId,b);assert.equal(replay.replayed,true);assert.deepEqual(replay.lessons,result.lessons);assert.equal(f.calls.creates,1);
  await assert.rejects(x.scheduleRecurring(packageId,{...b,count:3}),{statusCode:409});
  await assert.rejects(x.schedule(packageId,body()),{statusCode:409});
});
test("recurring series respects remaining credits and never partially writes",async()=>{
  const f=fixture();f.state().pkg.lessonCount=3;await assert.rejects(f.access().scheduleRecurring(packageId,body(10,{count:4})),{statusCode:409});assert.equal(f.state().lessons.length,0);
  f.calls.failWrite=true;await assert.rejects(f.access().scheduleRecurring(packageId,body(10,{count:3})));assert.equal(f.state().calendarVersion,0);assert.equal(f.state().pkg.__v,0);assert.equal(f.state().lessons.length,0);
});
test("partial series already stored is rejected rather than completed silently",async()=>{
  const f=fixture(),fields=scheduleBatchFields(body(10,{count:4}),true).rows[0];f.state().lessons.push(existing(10,"scheduled",fields));
  await assert.rejects(f.access().scheduleRecurring(packageId,body(10,{count:4})),{statusCode:409});assert.equal(f.state().lessons.length,1);
});
test("series overlapping itself triggers confirmation",()=>{
  const {rows}=scheduleBatchFields(body(10,{count:2,endsAt:"2026-12-04T18:00:00.000Z"}),true);
  assert.equal(findScheduleConflicts(rows,[]).length,1);
});
test("transaction retry creates only one complete series",async()=>{
  const f=fixture();f.calls.retry=true;await f.access().scheduleRecurring(packageId,body(10,{count:4}));assert.equal(f.state().lessons.length,4);assert.equal(f.state().pkg.__v,1);assert.equal(f.state().calendarVersion,1);
});
