import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrivateLessonPackagesService } from "../src/services/privateLessonPackagesServices.js";
import { displayDate, emptyFilters, filterPackages, packageStatus, participantsOf, summarizePackages, validPeriod } from "../src/features/privateLessons/privateLessonPackagesView.js";
const rows = [
  {id:"a",name:"4 aulas",status:"active",amount:760,contractedOn:"2026-11-01",participantIds:["u1","u2"],participants:[{id:"u1",name:"João Silva",registration:"000123"},{id:"u2",name:"Ana"}]},
  {id:"b",name:"Dança especial",status:"active",amount:200,contractedOn:"2026-11-30",participantIds:["u1"]},
  {id:"c",name:"10 aulas",status:"completed",amount:1800,contractedOn:"2026-10-31",participantIds:["u3"]},
  {id:"d",name:"Cancelado",status:"cancelled",amount:400,contractedOn:"2026-11-15",participantIds:["u4"]}
];
const response = (body, status=200) => ({ok:status<400,status,json:async()=>body});
test("filters by participant name, registration and package, ignoring accents", () => {
  for (const [search,expected] of [[" joao ",[rows[0]]],["000123",[rows[0]]],["danca",[rows[1]]],["ana",[rows[0]]],["missing",[]]]) assert.deepEqual(filterPackages(rows,{...emptyFilters(),search}),expected);
});
test("combines status and inclusive contract dates", () => assert.deepEqual(filterPackages(rows,{...emptyFilters(),status:"active",from:"2026-11-01",to:"2026-11-30"}),rows.slice(0,2)));
test("invalid period does not display results", () => {const f={...emptyFilters(),from:"2026-12-01",to:"2026-11-01"};assert.equal(validPeriod(f),false);assert.deepEqual(filterPackages(rows,f),[]);});
test("empty filters return all packages", () => assert.deepEqual(filterPackages(rows,emptyFilters()),rows));
test("indicators count unique active participants and exclude cancelled amounts", () => assert.deepEqual(summarizePackages(rows),{count:4,active:2,participants:2,contractedAmount:2760}));
test("monetary totals use cents and empty data returns zero", () => {assert.equal(summarizePackages([{...rows[0],amount:0.1},{...rows[1],amount:0.2}]).contractedAmount,0.3);assert.deepEqual(summarizePackages([]),{count:0,active:0,participants:0,contractedAmount:0});});
test("preserve unavailable participants and original order", () => {assert.deepEqual(participantsOf({...rows[0],participants:[rows[0].participants[1]]}),[{id:"u1",name:null,registration:null,available:false},rows[0].participants[1]]);});
test("formats dates without timezone shift and unknown statuses safely", () => {assert.equal(displayDate("2026-11-01"),"01/11/2026");assert.equal(displayDate(null),"—");assert.equal(packageStatus("completed").label,"Concluído");assert.equal(packageStatus("constructor").label,"Desconhecido");});
test("list unwraps API and only uses GET with abort signal",async()=>{const signal=new AbortController().signal;const service=createPrivateLessonPackagesService({base:"http://localhost:4000/",fetcher:async(url,options)=>{assert.equal(url,"http://localhost:4000/private-lesson-packages");assert.deepEqual(options,{method:"GET",signal});return response({success:true,body:rows});}});assert.deepEqual(await service.list({signal}),rows);});
test("detail encodes ID and validates returned package",async()=>{const service=createPrivateLessonPackagesService({base:"/api",fetcher:async(url,options)=>{assert.equal(url,"/api/private-lesson-packages/a%2Fb");assert.equal(options.method,"GET");return response({success:true,body:{id:"a/b"}});}});assert.deepEqual(await service.get("a/b"),{id:"a/b"});});
test("server access denial and application errors surface instead of empty data",async()=>{for(const [status,body] of [[403,{success:false,body:"Bloqueado"}],[200,{success:false,body:"Bloqueado"}]]){const service=createPrivateLessonPackagesService({fetcher:async()=>response(body,status)});await assert.rejects(service.list(),/Bloqueado/);}});
test("rejects malformed responses and mismatched detail",async()=>{const service=createPrivateLessonPackagesService({fetcher:async()=>response({success:true,body:{id:"b"}})});await assert.rejects(service.list(),/Lista/);await assert.rejects(service.get("a"),/Contratação inválida/);await assert.rejects(service.get(""),/Identificador/);});
test("non-JSON errors and cancellation propagate correctly",async()=>{const service=createPrivateLessonPackagesService({fetcher:async()=>({ok:false,status:502,json:async()=>{throw new SyntaxError();}})});await assert.rejects(service.list(),/HTTP 502/);const aborted=createPrivateLessonPackagesService({fetcher:async()=>({ok:true,status:200,json:async()=>{throw new DOMException("Abort","AbortError");}})});await assert.rejects(aborted.list(),{name:"AbortError"});});
