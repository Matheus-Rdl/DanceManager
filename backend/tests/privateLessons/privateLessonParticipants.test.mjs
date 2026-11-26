import test from "node:test";
import assert from "node:assert/strict";
import DataAccess from "../../src/modules/privateLessonPackages/privateLessonPackagesDataAccess.js";
import Controllers from "../../src/modules/privateLessonPackages/privateLessonPackagesControllers.js";
const users = [{_id:"507f1f77bcf86cd799439011",user_name:"Ana",user_mat:"000001",user_cpf:"hidden"},{_id:"507f1f77bcf86cd799439012",schoolId:"default",user_name:"Bia"},{_id:"507f1f77bcf86cd799439013",schoolId:"other",user_name:"Carlos"}];
function fixture(school){return new Controllers(new DataAccess({resolveSchoolId:()=>school,userModel:{find(scope){assert.deepEqual(scope,school==="default"?{$or:[{schoolId:school},{schoolId:{$exists:false}}]}:{schoolId:school});return {setOptions(v){assert.deepEqual(v,{strictQuery:false});return this;},select(v){assert.equal(v,"_id user_name user_mat");return this;},sort(v){assert.deepEqual(v,{user_name:1,_id:1});return this;},async lean(){return users.filter(u=>u.schoolId===school||(school==="default"&&!Object.hasOwn(u,"schoolId")));}};}}}));}
test("default school includes legacy users and projects only participant fields",async()=>{const r=await fixture("default").listParticipants();assert.equal(r.statusCode,200);assert.deepEqual(r.body,[{id:users[0]._id,name:"Ana",registration:"000001"},{id:users[1]._id,name:"Bia",registration:null}]);});
test("other schools do not receive legacy or default users",async()=>{assert.deepEqual((await fixture("other").listParticipants()).body,[{id:users[2]._id,name:"Carlos",registration:null}]);});
test("empty school returns a successful empty array",async()=>assert.deepEqual((await fixture("missing").listParticipants()).body,[]));
