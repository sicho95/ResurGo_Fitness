import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const fusion=fs.readFileSync(path.join(root,"app/sensor-fusion.js"),"utf8");
const ble=fs.readFileSync(path.join(root,"app/ble-bluefy.js"),"utf8");

function appContext({supported=false,device=null}={}){
  const buttons={bleHrSourceType:{value:"chest_strap"},bleMachineKind:{value:"treadmill"}};
  const notices=[], connections=[];
  const context=vm.createContext({
    DataView,Uint8Array,Date,Number,Math,isSecureContext:true,
    navigator:{bluetooth:supported?{requestDevice:async(options)=>{connections.push(options);return device;}}:undefined},
    document:{getElementById:id=>buttons[id]||null,createRange:()=>({selectNodeContents(){}})},
    globalThis:null,location:{href:"https://example.org/resurgo/index.html"},
    window:{getSelection:()=>({removeAllRanges(){},addRange(){}})},
    alert:m=>notices.push(m),esc:s=>s
  });
  context.globalThis=context;
  vm.runInContext(fusion+"\n"+ble+"\n globalThis.__test={bleHeartPacket,bleParseFtms,bleParsePm5,bleCscPacket,bleCyclingPowerPacket,bleBikeDeltas,bleMetric,bleIngestMetric,bleMachineSnapshot,bleHrSnapshot,bleHrConnect,bleHrDisconnect,bleSourceEnabled,bleMachineConnect,bleMachineDisconnect,bleTextStatus,bluefyHelpPanel};",context);
  return {ctx:context,api:context.__test,notices,buttons,connections};
}
const packet=bytes=>new DataView(Uint8Array.from(bytes).buffer);

test("BLE HR 8/16-bit, malformed packet rejected",()=>{
  const {api}=appContext();
  assert.equal(api.bleHeartPacket(packet([0x00,72])).heartRate,72);
  assert.equal(api.bleHeartPacket(packet([0x01,0xc8,0x00])).heartRate,200);
  assert.throws(()=>api.bleHeartPacket(packet([0x01,0x70])),/tronquée/);
  assert.throws(()=>api.bleHeartPacket(packet([0x00,0x00])),/incohérente/);
});

test("FTMS treadmill speed and total distance decode",()=>{
 const {api}=appContext();
 const frame=api.bleParseFtms("treadmill",packet([0x04,0,0x01,0x04,0xe2,0x04,0]));
 assert.equal(frame.speedKmh,10.25);
 assert.equal(frame.distanceM,1250);
});
test("FTMS bike cadence and distance offset, no invented fields",()=>{
 const {api}=appContext();
 const frame=api.bleParseFtms("bike",packet([0x14,0,0x2e,0x09,0xa6,0x00,0xb8,0x0b,0]));
 assert.equal(frame.speedKmh,23.5);assert.equal(frame.cadenceRpm,83);assert.equal(frame.distanceM,3000);
 assert.equal(frame.heartRate,undefined);
});
test("FTMS cross trainer uses 3-byte flags header",()=>{
 const {api}=appContext();
 const frame=api.bleParseFtms("elliptical",packet([0x04,0,0,0xf4,0x01,0x5e,0x01,0]));
 assert.equal(frame.speedKmh,5);assert.equal(frame.distanceM,350);
});
test("FTMS truncated packets rejected, no progress fabricated from flag-only",()=>{
 const {api}=appContext();
 assert.throws(()=>api.bleParseFtms("bike",packet([0x14,0,0x2e])),/tronquée/);
 assert.deepEqual(JSON.parse(JSON.stringify(api.bleParseFtms("bike",packet([1,0])))),{kind:"bike",flags:1});
});
test("priority chest > watch > machine, stale falls through",()=>{
 const {api}=appContext(),now=Date.now();
 api.bleIngestMetric("heartRate",110,"fitness_machine","gym",now);
 api.bleIngestMetric("heartRate",112,"watch","watch",now);
 api.bleIngestMetric("heartRate",114,"chest_strap","hrm",now);
 assert.equal(api.bleMetric("heartRate").value,114);
 assert.equal(api.bleMetric("heartRate").source,"chest_strap");
 api.bleIngestMetric("heartRate",115,"chest_strap","hrm",now-20000);
 assert.equal(api.bleMetric("heartRate").source,"watch");
});
test("Bluefy information and offline fallback visible to users",()=>{
 const {api}=appContext();
 assert.match(api.bleTextStatus(),/Safari avec l’extension beacio/);
 const ui=api.bluefyHelpPanel();
 for(const phrase of ["ⓘ","Copier l’adresse","beacio","FTMS","App Store","https:\/\/example.org\/resurgo\/index.html"])
   assert.ok(ui.includes(phrase),phrase);
});
function mockMachine(){
 const listeners={};
 const characteristic={
   async startNotifications(){return this;},
   addEventListener(name,fn){listeners[name]=fn;},
   removeEventListener(name){delete listeners[name];}
 };
 const device={
   id:"ftms-test",name:"FTMS bike",
   addEventListener(name,fn){listeners[name]=fn;},
   removeEventListener(name){delete listeners[name];},
   gatt:{connected:true,async connect(){return {getPrimaryService:async()=>({
     getCharacteristic:async()=>characteristic
   })};},disconnect(){this.connected=false;}}
 };
 return {device,listeners,characteristic};
}
test("user-initiated FTMS connection requires fresh speed or distance",async()=>{
 const m=mockMachine(),{api,buttons,connections}=appContext({supported:true,device:m.device});
 buttons.bleMachineKind.value="bike";
 await api.bleMachineConnect();
 assert.equal(connections.length,1);
 assert.equal(api.bleMachineSnapshot().available,false);
 m.listeners.characteristicvaluechanged({target:{value:packet([0x14,0,0x2e,0x09,0xa6,0,0xb8,0x0b,0])}});
 assert.equal(api.bleMachineSnapshot().available,true);
 assert.equal(api.bleMachineSnapshot().distanceM,3000);
 assert.equal(api.bleMetric("speed").source,"fitness_machine");
 await api.bleMachineDisconnect();
 assert.equal(api.bleMachineSnapshot().available,false);
});

test("FTMS bike optional power, resistance and HR fields",()=>{
 const {api}=appContext();
 const f=api.bleParseFtms("bike",packet([0x74,0x02,0x2e,0x09,0xa6,0,0xb8,0x0b,0,0x14,0,0x96,0,130]));
 assert.equal(f.powerW,150);assert.equal(f.heartRate,130);assert.equal(f.resistanceLevel,2);assert.equal(f.cadenceRpm,83);
});
test("PM5 cycling services decode and event counter rollover",()=>{
 const {api}=appContext();
 const a=api.bleCscPacket(packet([3,10,0,0,0,0,252,255,255,0,252]));
 const b=api.bleCscPacket(packet([3,12,0,0,0,0,4,0,0,0,0]));
 const d=api.bleBikeDeltas(b,a);
 assert.ok(Math.abs(d.speedKmh-7.2)<1e-9);assert.equal(d.cadenceRpm,60);
 assert.equal(api.bleCyclingPowerPacket(packet([0,0,150,0])).powerW,150);
 assert.throws(()=>api.bleCscPacket(packet([1,0])),/tronquée/);
});

test("Garmin merge is profile scoped, non-destructive, idempotent and prefers measured values",()=>{
 const state={activities:[],metrics:[]};
 const ctx=vm.createContext({state,Date,Number,Math});
 const garmin=fs.readFileSync(path.join(root,"app/garmin-personal.js"),"utf8");
 vm.runInContext(garmin+"\n globalThis.api={garminUpsertActivities,garminVisibleActivities,garminReconcile};",ctx);
 const local={id:"local",profileId:"a",source:"resurgo_ftms_ble",type:"bike",startedAt:"2026-11-25T11:00:00Z",durationSeconds:1200,distanceKm:4,estimatedDistance:false,averagePowerW:140,notes:"coach"};
 state.activities.push(local,{...local,id:"other",profileId:"b"});
 const g={garminActivityId:"42",type:"bike",startedAt:"2026-11-25T11:01:00Z",durationSeconds:1210,distanceKm:5,hrAvg:130,averagePowerW:145};
 assert.equal(ctx.api.garminUpsertActivities("a",[g]),true);
 assert.equal(ctx.api.garminVisibleActivities("a").length,1);
 assert.equal(local.distanceKm,4);assert.equal(local.hrAvg,130);assert.equal(local.averagePowerW,145);assert.equal(local.notes,"coach");
 assert.equal(ctx.api.garminVisibleActivities("b").length,1);
 assert.equal(ctx.api.garminUpsertActivities("a",[g]),false);
 assert.equal(state.activities.length,3);
});

test("PM5 native status decodes distance, speed, cadence, HR and power",()=>{
 const {api}=appContext();
 assert.equal(api.bleParsePm5(0x31,packet([0,0,0,0x10,0x27,0])).distanceM,1000);
 const a=api.bleParsePm5(0x32,packet([0,0,0,0x88,0x13,80,135]));
 assert.equal(a.speedKmh,18);assert.equal(a.cadenceRpm,80);assert.equal(a.heartRate,135);
 assert.equal(api.bleParsePm5(0x36,packet([0,0,0,150,0])).powerW,150);
 assert.equal(api.bleParsePm5(0x32,packet([0,0,0,0,0,0,255])).heartRate,undefined);
});
test("Bike chooser uses single FTMS filter without mixed name filters",async()=>{
 const m=mockMachine(),{api,buttons,connections}=appContext({supported:true,device:m.device});
 buttons.bleMachineKind.value="bike";await api.bleMachineConnect();
 assert.equal(connections[0].filters.length,1);assert.equal(connections[0].filters[0].services[0],0x1826);
 assert.equal(connections[0].optionalServices,undefined);
});
test("PM5 direct chooser subscribes to native data and exposes real distance",async()=>{
 const handlers={},service={getCharacteristic:async id=>({addEventListener:(n,fn)=>{handlers[id]=fn},startNotifications:async()=>{},removeEventListener(){}})};
 const device={name:"PM5 test",id:"pm5",addEventListener(){},removeEventListener(){},gatt:{connected:true,connect:async()=>({getPrimaryService:async id=>{assert.equal(id,"ce060030-43e5-11e4-916c-0800200c9a66");return service}}),disconnect(){}}};
 const {api,connections}=appContext({supported:true,device});
 await api.bleMachineConnect("pm5");
 assert.equal(connections[0].filters[0].services[0],"ce060000-43e5-11e4-916c-0800200c9a66");
 assert.equal(connections[0].optionalServices[0],"ce060030-43e5-11e4-916c-0800200c9a66");
 handlers["ce060031-43e5-11e4-916c-0800200c9a66"]({target:{value:packet([0,0,0,0x10,0x27,0])}});
 assert.equal(api.bleMachineSnapshot().distanceM,1000);assert.equal(api.bleMachineSnapshot().protocol,"PM5 natif");
});

test("PM5 scan and data-filter alternatives do not mix service filters",async()=>{
 const m=mockMachine(),{api,connections}=appContext({supported:true,device:m.device});
 await api.bleMachineConnect("pm5scan");
 assert.equal(connections[0].acceptAllDevices,true);assert.equal(connections[0].optionalServices.length,1);
 await api.bleMachineConnect("pm5data");
 assert.equal(connections[1].filters[0].services[0],"ce060030-43e5-11e4-916c-0800200c9a66");assert.equal(connections[1].optionalServices,undefined);
});

test("source toggles fall through without discarding other sensors",()=>{
 const {api}=appContext(),now=Date.now();
 api.bleIngestMetric("heartRate",120,"watch","watch",now);api.bleIngestMetric("heartRate",122,"chest_strap","strap",now);
 assert.equal(api.bleHrSnapshot().bpm,122);api.bleSourceEnabled.chest_strap=false;assert.equal(api.bleHrSnapshot().bpm,120);
 api.bleSourceEnabled.watch=false;assert.equal(api.bleHrSnapshot().available,false);
});
test("partial indoor session merges with full Garmin recording without preferring partial distance",()=>{
 const state={activities:[],metrics:[]},ctx=vm.createContext({state,Date,Number,Math});
 vm.runInContext(fs.readFileSync(path.join(root,"app/garmin-personal.js"),"utf8")+"\n globalThis.api={garminUpsertActivities,garminVisibleActivities};",ctx);
 const local={id:"local",profileId:"a",source:"resurgo_pm5_ble",machineKind:"bike",type:"bike",startedAt:"2026-11-25T12:50:00Z",durationSeconds:600,distanceKm:4,estimatedDistance:false};
 state.activities.push(local);
 ctx.api.garminUpsertActivities("a",[{garminActivityId:"1",type:"bike",machineKind:"bike",startedAt:"2026-11-25T12:20:00Z",durationSeconds:2700,distanceKm:17}]);
 assert.equal(ctx.api.garminVisibleActivities("a").length,1);assert.equal(local.distanceKm,17);assert.equal(local.garminLocalMetrics.distanceKm,4);assert.equal(local.garminPartialRecording,true);
});

test("beacio setup replaces old user guidance",()=>{const {api}=appContext();assert.match(api.bluefyHelpPanel(),/Safari \+ beacio/);assert.doesNotMatch(api.bluefyHelpPanel(),/Bluefy/);});
