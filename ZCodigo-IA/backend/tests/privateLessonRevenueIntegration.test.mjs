import test from "node:test";
import assert from "node:assert/strict";
import PrivateLessonRevenueIntegration from "../src/modules/privateLessonPayments/privateLessonRevenueIntegration.js";
import PrivateLessonPaymentsDataAccess from "../src/modules/privateLessonPayments/privateLessonPaymentsDataAccess.js";
import { buildFinancialMovements } from "../src/modules/financial/financialMovements.js";
import { calculateFinancialAccountBalances } from "../src/modules/financialAccounts/financialAccountsBalanceRules.js";
import { privateLessonPackagesAccessGate } from "../src/modules/privateLessonPackages/privateLessonPackagesAccess.js";

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const packageId=id(1), accountId=id(2), secondAccount=id(3), day="2026-11-26";
const body=(n=10,amount=300,extra={})=>({requestId:id(n),amount,receivedAt:day,method:"Pix",accountId,...extra});
const clone=structuredClone;
/* EN: In-memory transactional double. It never imports Mongoose or connects to a database.
   PT: Simulador de transação em memória. Não importa Mongoose nem conecta a um banco. */
function fixture() {
  let state={pkg:{id:packageId,schoolId:"default",name:"4 aulas",status:"active",amount:760,contractedOn:"2026-11-01",participantIds:["a","b"],__v:0,payments:[]},accounts:[accountId,secondAccount].map(id=>({id,schoolId:"default",active:true,balanceDate:"2026-06-30",initialBalance:0,__v:0})),revenues:[]};
  const calls={ended:0,transactions:0,creates:0,locks:0,failRevenue:null,failLock:false,failTransaction:false,retry:false};
  let active=false, draft;
  const session={inTransaction:()=>active,async withTransaction(fn,opts){
    assert.deepEqual(opts,{readConcern:{level:"snapshot"},writeConcern:{w:"majority"}});
    calls.transactions++; if(calls.failTransaction) throw Error("Transactions unsupported");
    active=true; try { draft=clone(state); await fn(); if(calls.retry){draft=clone(state);await fn();} state=draft; } finally {active=false;draft=undefined;}
  },async endSession(){calls.ended++;}};
  const get=()=>{assert.equal(active,true);return draft;};
  const query=value=>({session(s){assert.equal(s,session);return this;},async lean(){return clone(value);}});
  const match=(r,q)=>r && Object.entries(q).every(([k,v])=>k==="payments.requestId"?!r.payments.some(p=>p.requestId===v.$ne):k==="balanceDate"&&v?.$lt?r[k]<v.$lt:r[k]===v);
  const packageModel={db:{async startSession(){return session;}},findOne(q){const p=get().pkg;return query(match(p,q)?p:null);},findOneAndUpdate(q,u,o){assert.equal(o.session,session);const p=get().pkg;if(!match(p,q))return query(null);p.payments.push(clone(u.$push.payments));Object.assign(p,u.$set);p.__v+=u.$inc.__v;return query(p);}};
  const accountModel={findOne(q){return query(get().accounts.find(a=>match(a,q))??null);},findOneAndUpdate(q,u,o){assert.equal(o.session,session);calls.locks++;const a=get().accounts.find(a=>match(a,q));if(!a||calls.failLock)return query(null);a.__v+=u.$inc.__v;return query(a);}};
  const revenueModel={findOne(q){return query(get().revenues.find(r=>match(r,q))??null);},async create(rows,o){assert.equal(o.session,session);assert.equal(rows.length,1);calls.creates++;if(calls.failRevenue)throw calls.failRevenue;get().revenues.push(clone(rows[0]));return rows;}};
  let n=100;
  const access=(school="default")=>new PrivateLessonRevenueIntegration({paymentAccess:new PrivateLessonPaymentsDataAccess({packageModel,accountModel,resolveSchoolId:()=>school,clock:()=>new Date("2026-11-26T16:00:00Z"),makeId:()=>id(n++)}),packageModel,accountModel,revenueModel,resolveSchoolId:()=>school});
  return {access,calls,state:()=>state};
}
test("partial receipts create settled revenues and no pending obligations",async()=>{
  const f=fixture(), x=f.access();const r=await x.receive(packageId,body());const v=f.state().revenues[0];
  assert.equal(r.revenueId,r.payment.id);assert.equal(v.sourceId,r.payment.id);assert.equal(v.sourceType,"privateLesson");assert.equal(v.schoolId,"default");assert.equal(v.category,"Aulas particulares");assert.equal(v.status,"received");assert.equal(v.amount,300);assert.equal(v.receivedAmount,300);assert.equal(v.receivedAt,day);assert.equal(v.dueDate,day);assert.equal(v.reference,"2026-11");assert.equal(v.accountId,accountId);assert.equal(v.history[0].after.packageId,packageId);assert.equal(r.summary.outstandingAmount,460);assert.equal(f.state().pkg.payments.length,1);assert.equal(f.calls.ended,1);
});
test("multiple participants and multiple accounts count each receipt once in movements and balances",async()=>{
  const f=fixture(),x=f.access();await x.receive(packageId,body());await x.receive(packageId,body(11,200,{accountId:secondAccount}));const r=await x.receive(packageId,body(12,260));assert.equal(r.summary.paymentStatus,"paid");
  const {revenues,accounts}=f.state();assert.equal(revenues.length,3);const movements=buildFinancialMovements({revenues});assert.equal(movements.totals.received,760);assert.equal(movements.totals.count,3);assert.equal(buildFinancialMovements({revenues},{},{accountId}).totals.received,560);
  const balances=calculateFinancialAccountBalances({accounts,revenues},day);assert.deepEqual(balances.accounts.map(a=>a.balance),[560,200]);assert.equal(balances.totalBalance,760);
});
test("replaying an identical request verifies the revenue and never writes twice",async()=>{const f=fixture(),x=f.access();const a=await x.receive(packageId,body());f.state().accounts[0].active=false;const b=await x.receive(packageId,body());assert.equal(b.replayed,true);assert.equal(a.revenueId,b.revenueId);assert.equal(f.calls.creates,1);assert.equal(f.calls.locks,1);assert.equal(f.state().pkg.payments.length,1);});
test("same key with changed amount fails without new revenue",async()=>{const f=fixture(),x=f.access();await x.receive(packageId,body());await assert.rejects(x.receive(packageId,body(10,301)),{statusCode:409});assert.equal(f.state().revenues.length,1);assert.equal(f.calls.ended,2);});
test("a missing or modified linked revenue is not silently recreated",async()=>{for(const mutate of [s=>s.revenues.pop(),s=>s.revenues[0].receivedAmount=1,s=>s.revenues[0].status="cancelled"]){const f=fixture(),x=f.access();await x.receive(packageId,body());mutate(f.state());await assert.rejects(x.receive(packageId,body()),{statusCode:409});assert.equal(f.calls.creates,1);}});
test("revenue insert failure aborts the receipt and account version update",async()=>{const f=fixture();f.calls.failRevenue=Error("write failed");await assert.rejects(f.access().receive(packageId,body()),/write failed/);assert.equal(f.state().pkg.payments.length,0);assert.equal(f.state().accounts[0].__v,0);assert.equal(f.state().revenues.length,0);assert.equal(f.calls.ended,1);});
test("duplicate revenue key aborts the transaction and returns conflict",async()=>{const f=fixture();f.calls.failRevenue=Object.assign(Error("duplicate"),{code:11000});await assert.rejects(f.access().receive(packageId,body()),{statusCode:409});assert.equal(f.state().pkg.payments.length,0);assert.equal(f.state().revenues.length,0);});
test("account lock failure rolls back the package and prevents revenue creation",async()=>{const f=fixture();f.calls.failLock=true;await assert.rejects(f.access().receive(packageId,body()),{statusCode:409});assert.equal(f.state().pkg.payments.length,0);assert.equal(f.calls.creates,0);});
test("no transaction support means no fallback writes",async()=>{const f=fixture();f.calls.failTransaction=true;await assert.rejects(f.access().receive(packageId,body()),/Transactions unsupported/);assert.equal(f.calls.creates,0);assert.equal(f.state().pkg.payments.length,0);assert.equal(f.calls.ended,1);});
test("transaction callback retry commits only the final attempt",async()=>{const f=fixture();f.calls.retry=true;const r=await f.access().receive(packageId,body());assert.equal(f.calls.creates,2);assert.equal(f.state().revenues.length,1);assert.equal(f.state().pkg.payments.length,1);assert.equal(f.state().revenues[0].id,r.payment.id);});
test("overpayment and cross-school access never generate revenue",async()=>{const f=fixture();await assert.rejects(f.access().receive(packageId,body(10,761)),{statusCode:409});await assert.rejects(f.access("other").receive(packageId,body()),{statusCode:404});assert.equal(f.calls.creates,0);});
test("production access remains blocked",()=>{const old=process.env.NODE_ENV;try{process.env.NODE_ENV="production";let status;const res={status(s){status=s;return this;},send(v){return v;}};const result=privateLessonPackagesAccessGate({},res,()=>assert.fail("Production access allowed"));assert.equal(status,403);assert.equal(result.success,false);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}});
