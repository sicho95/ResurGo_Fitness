import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const source=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),"../static/sw.js"),"utf8");

test("service worker displays push and opens the exact notification on click",async()=>{
  const handlers={},displayed=[],opened=[];
  const scope="https://sicho95.github.io/ResurGo_Fitness/";
  const self={
    location:{origin:"https://sicho95.github.io",href:scope+"sw.js"},
    registration:{scope,async showNotification(title,options){displayed.push({title,options});}},
    clients:{async matchAll(){return [];},async openWindow(url){opened.push(url);}},
    addEventListener(name,fn){handlers[name]=fn;}
  };
  const fakeStorage={open(){throw Error("IndexedDB temporarily unavailable");}};
  const context=vm.createContext({self,URL,Date,Math,console,indexedDB:fakeStorage,caches:{}});
  vm.runInContext(source,context);
  const promises=[];
  handlers.push({data:{json:()=>({
    id:"reminder-20261030",title:"Séance ResurGo",body:"Une séance est prête.",
    sessionId:"session-42",profileId:"P-1"})},waitUntil:p=>promises.push(p)});
  await Promise.all(promises);
  assert.equal(displayed.length,1);
  assert.equal(displayed[0].options.data.notificationId,"reminder-20261030");
  const clicks=[];
  handlers.notificationclick({
    notification:{data:{notificationId:"reminder-20261030"},close(){}},
    waitUntil:p=>clicks.push(p)
  });
  await Promise.all(clicks);
  assert.equal(opened.length,1);
  const target=new URL(opened[0]);
  assert.equal(target.origin,"https://sicho95.github.io");
  assert.equal(target.pathname,"/ResurGo_Fitness/");
  assert.equal(target.searchParams.get("notification"),"reminder-20261030");
  assert.ok(source.includes('indexedDB.open("ResurGoPushInboxV1"'),
    "Push inbox must persist messages even when the app is closed");
});
