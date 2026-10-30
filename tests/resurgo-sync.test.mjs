import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {webcrypto} from "node:crypto";
import {fileURLToPath} from "node:url";

const folder=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(folder,"../app/sync-local-first.js"),"utf8");
const clone=x=>structuredClone(x);
function makeServer(){
  const heads=new Map(), events=[];
  let online=true;
  return {
    heads,events,
    setOnline:val=>{online=val;},
    async request(base,url,req={}){
      if(!online)throw Error("NAS offline");
      if(url.startsWith("/api/v1/sync/pull")){
        const query=new URL("http://localhost"+url).searchParams;
        const cursor=Number(query.get("cursor")),limit=Number(query.get("limit")||100);
        const found=events.filter(e=>e.sequence>cursor);
        return {events:found.slice(0,limit),nextCursor:found.length?
          found.slice(0,limit).at(-1).sequence:cursor,hasMore:found.length>limit};
      }
      if(url==="/api/v1/sync/push"){
        const results=[];
        for(const op of req.payload.operations){
          const key=op.entityType+":"+op.entityId;
          const current=heads.get(key);
          const duplicate=events.find(x=>x.operation_id===op.operationId);
          if(duplicate){results.push({operationId:op.operationId,status:"duplicate",revision:duplicate.revision,sequence:duplicate.sequence});continue;}
          if((current?.revision||0)!==op.expectedRevision){
            results.push({operationId:op.operationId,status:"conflict",currentRevision:current?.revision||0});continue;
          }
          const revision=(current?.revision||0)+1;
          heads.set(key,{revision,payload:clone(op.payload)});
          const evt={sequence:events.length+1,kind:op.entityType,entity_id:op.entityId,
            revision,deleted:op.deleted,payload:clone(op.payload),operation_id:op.operationId};
          events.push(evt);
          results.push({operationId:op.operationId,status:"applied",revision,sequence:evt.sequence});
        }
        return {results};
      }
      throw Error("Unexpected route: "+url);
    }
  };
}
const initial=()=>{
  const p={id:"P-1",name:"Coureur",health:{fatigue:0}};
  return {
    activeProfileId:p.id,profiles:[p],
    plans:[{id:"Plan-1",profileId:p.id,title:"Plan facile"}],
    activities:[{id:"Activity-1",profileId:p.id,type:"run",distanceKm:3}],
    metrics:[{id:"Metric-1",profileId:p.id,weightKg:80}],
    sessionRuns:[],assessments:[],settings:{},ui:{}
  };
};
function makeDevice(server,deviceId,seed=null,profileId="nas-P"){
  const data=seed?clone(seed):initial(),store=new Map();
  store.set("nasConnection",{url:"https://nas.example",profileId,deviceId,token:"test",
    accountRole:deviceId==="A"?"owner":"paired",
    localProfileId:seed?.activeProfileId||null});
  const context=vm.createContext({
    state:data,crypto:webcrypto,clone,Date,console,document:{visibilityState:"visible"},
    window:{addEventListener(){}},clearTimeout(){},setTimeout(){return 1;},setInterval(){return 1;},
    render(){},alert(){},confirm(){return false;},
    get:async k=>clone(store.get(k)),
    put:async(k,v)=>{store.set(k,clone(v));},
    nasStoredConnection:async()=>clone(store.get("nasConnection")),
    nasRequest:(base,url,opts)=>server.request(base,url,opts||{})
  });
  vm.runInContext(source+"\n globalThis.api={nasSyncNow,nasSyncStage,nasSyncLoadMeta,nasSyncPull,nasSyncResolveConflicts};",context);
  return {context,store,api:context.api};
}

test("initial sync uploads records and retains initial local data",async()=>{
  const server=makeServer(),A=makeDevice(server,"A");
  await A.api.nasSyncNow();
  assert.equal(server.events.length,4);
  assert.equal(server.heads.get("profile_settings:P-1").payload.profile.name,"Coureur");
  assert.equal(server.heads.get("activity:Activity-1").payload.distanceKm,3);
  assert.equal(A.store.get("nasSyncMeta").outbox.length,0);
});

test("second iPhone pulls existing profile before sending unrelated local data",async()=>{
  const server=makeServer(),A=makeDevice(server,"A");
  await A.api.nasSyncNow();
  const empty=initial();
  empty.profiles=[{id:"NEW",name:"Local provisoire",health:{}}];
  empty.activeProfileId="NEW";empty.plans=[];empty.activities=[];empty.metrics=[];
  const B=makeDevice(server,"B",empty);
  // Initial pairing has no confirmed localProfileId.
  B.store.get("nasConnection").localProfileId=null;
  await B.api.nasSyncNow();
  assert.equal(B.context.state.activeProfileId,"P-1");
  assert.equal(B.store.get("nasConnection").localProfileId,"P-1");
  assert.equal(B.context.state.plans.find(x=>x.id==="Plan-1").title,"Plan facile");
  assert.equal(server.heads.has("profile_settings:NEW"),false);
});

test("offline edits remain in outbox, retry after reconnection",async()=>{
  const server=makeServer(),A=makeDevice(server,"A");
  await A.api.nasSyncNow();
  server.setOnline(false);
  A.context.state.plans[0].title="Plan modifié offline";
  await A.api.nasSyncNow();
  assert.ok(A.store.get("nasSyncMeta").outbox.length>0);
  assert.equal(server.heads.get("plan:Plan-1").revision,1);
  server.setOnline(true);
  await A.api.nasSyncNow();
  assert.equal(server.heads.get("plan:Plan-1").revision,2);
  assert.equal(server.heads.get("plan:Plan-1").payload.title,"Plan modifié offline");
});

test("divergent same-entity edits: conflict, no silent overwrite",async()=>{
  const server=makeServer(),A=makeDevice(server,"A");
  await A.api.nasSyncNow();
  const B=makeDevice(server,"B",null);
  B.store.get("nasConnection").localProfileId=null;
  await B.api.nasSyncNow();
  A.context.state.plans[0].title="Plan A";
  B.context.state.plans[0].title="Plan B";
  await A.api.nasSyncNow();
  await B.api.nasSyncNow();
  assert.equal(server.heads.get("plan:Plan-1").payload.title,"Plan A");
  assert.equal(B.context.state.plans[0].title,"Plan B");
  assert.ok(B.store.get("nasSyncMeta").conflicts.some(x=>x.entityId==="Plan-1"));
});

test("remote changes to independent entities converge both ways",async()=>{
  const server=makeServer(),A=makeDevice(server,"A");
  await A.api.nasSyncNow();
  const B=makeDevice(server,"B",null);B.store.get("nasConnection").localProfileId=null;
  await B.api.nasSyncNow();
  A.context.state.activities.push({id:"Activity-2",profileId:"P-1",type:"bike",distanceKm:12});
  B.context.state.metrics.push({id:"Metric-2",profileId:"P-1",weightKg:79});
  await A.api.nasSyncNow();await B.api.nasSyncNow();await A.api.nasSyncNow();
  assert.ok(A.context.state.metrics.some(x=>x.id==="Metric-2"));
  assert.ok(B.context.state.activities.some(x=>x.id==="Activity-2"));
});

test("first iPhone syncs both profiles with their own dependent records",async()=>{
  const server=makeServer(),seed=initial();
  const second={id:"P-2",name:"Cycliste",health:{fatigue:0}};
  seed.profiles.push(second);
  seed.plans.push({id:"Plan-2",profileId:"P-2",title:"Vélo facile"});
  seed.activities.push({id:"Activity-2",profileId:"P-2",type:"bike",distanceKm:14});
  seed.metrics.push({id:"Metric-2",profileId:"P-2",weightKg:70});
  const A=makeDevice(server,"A",seed);
  await A.api.nasSyncNow();
  assert.equal(server.heads.get("profile_settings:P-1").payload.profile.name,"Coureur");
  assert.equal(server.heads.get("profile_settings:P-2").payload.profile.name,"Cycliste");
  assert.equal(server.heads.get("activity:Activity-2").payload.profileId,"P-2");
  assert.equal(A.store.get("nasSyncMeta").remoteProfileIds.length,2);
  const B=makeDevice(server,"B");
  B.store.get("nasConnection").localProfileId=null;
  await B.api.nasSyncNow();
  assert.equal(B.context.state.profiles.length,2);
  assert.equal(B.context.state.profiles.find(x=>x.id==="P-2").name,"Cycliste");
  assert.equal(B.context.state.activities.find(x=>x.id==="Activity-2").distanceKm,14);
  assert.equal(B.store.get("nasSyncMeta").conflicts.length,0);
});

test("paired Mac does not silently upload its unrelated local temporary profile",async()=>{
  const server=makeServer(),A=makeDevice(server,"A");
  await A.api.nasSyncNow();
  const seed=initial();
  seed.activeProfileId="TEMP";
  seed.profiles=[{id:"TEMP",name:"Profil provisoire",health:{}}];
  seed.plans=[];seed.activities=[];seed.metrics=[];
  const B=makeDevice(server,"B",seed);
  B.store.get("nasConnection").localProfileId=null;
  await B.api.nasSyncNow();
  assert.equal(server.heads.has("profile_settings:TEMP"),false);
  assert.equal(server.heads.has("profile_settings:P-1"),true);
  assert.equal(B.context.state.profiles.some(p=>p.id==="TEMP"),true);
  assert.equal(B.context.state.profiles.some(p=>p.id==="P-1"),true);
});
