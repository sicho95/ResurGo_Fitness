// Reproduce the Safari black-screen regression from 2026-10-30.
// The legacy source is assembled from fragments that span function boundaries.
// New modules must be injected inside the main app closure, not inside a
// legacy diagram function that is only called on demand.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

test("the built webapp exposes all new modules in render() lexical scope",()=>{
  const source=readFileSync(resolve(".webapp-build/app.js"),"utf8");
  const initCall="  init();\n})();";
  assert.ok(source.includes(initCall),"Cannot safely replace the PWA bootstrap for the test.");
  const names=[
    "liveCoachView","liveStart","liveStartIndoor","liveRecoverAfterReload",
    "bleHrConnect","bleHrDisconnect","bleMachineConnect","bleMachineDisconnect",
    "bluefyHelpPanel","bluefyCopyAddress","voiceSpeakId","voicePreview",
    "voiceInstallOffline","nasSyncStart","nasSyncNow","nasSyncResolveConflicts",
    "nasCreateProfile","nasPairWithCode","exportEncryptedBackup",
    "pushInboxOpen","pushInboxView","pushEnableFromSettings","pushTestFromSettings",
    "restoreEncryptedBackup","sensorAccept","chooseSensorMetric","sessionLauncher","openPersonalLive","launchPlannedSession","garminAutoStart","garminReconcile",
  ];
  const report=names.map(name=>name+':typeof '+name).join(",");
  const replacement="  output.scope={"+report+"};\n})();";
  const safeSource=source.replace(initCall,replacement);
  const output={scope:null};
  const probe=new Function("window","document","navigator","location","output",safeSource);
  probe({}, {}, {}, {}, output);
  assert.ok(output.scope,"Failed to enter application closure.");
  for(const [name,value] of Object.entries(output.scope)){
    assert.equal(value,"function",name+" is missing from app render/bind scope.");
  }
});

test("bottom navigation handlers remain bound when push controls are present",()=>{
  const source=readFileSync(resolve(".webapp-build/app.js"),"utf8");
  const initCall="  init();\n})();";
  assert.ok(source.includes(initCall),"Cannot intercept bootstrap safely.");
  const safeSource=source.replace(initCall,"  output.bind=bind;\n})();");
  const bottomTab={dataset:{view:"plan"}};
  const inboxButton={};
  const personalButton={dataset:{personalLive:"bike"}};
  const pushRow={dataset:{openPush:"push_123"}};
  const sessionRow={dataset:{pushSession:"session_123"}};
  const documentStub={
    getElementById:id=>id==="pushInboxButton"?inboxButton:null,
    querySelectorAll:selector=>({
      "[data-view]":[bottomTab],
      "[data-personal-live]":[personalButton],
      "[data-open-push]":[pushRow],
      "[data-push-session]":[sessionRow]
    }[selector]||[]),
    addEventListener:()=>{}
  };
  const windowStub={addEventListener:()=>{}};
  const output={bind:null};
  new Function("window","document","navigator","location","output",safeSource)(
    windowStub,documentStub,{}, {},output);
  assert.equal(typeof output.bind,"function");
  assert.doesNotThrow(()=>output.bind(),"Binding must not abort before bottom tabs.");
  assert.equal(typeof personalButton.onclick,"function");
  for(const [label,button] of Object.entries({bottomTab,inboxButton,pushRow,sessionRow}))
    assert.equal(typeof button.onclick,"function",label+" is not interactive");
});

test("the header keeps the version visible beside a compact notification action",()=>{
  const source=readFileSync(resolve(".webapp-build/app.js"),"utf8");
  const css=readFileSync(resolve(".webapp-build/styles.css"),"utf8");
  assert.ok(source.includes('class="brandVersion"'),"The version label is absent.");
  assert.ok(source.includes('class="notificationButton"'),"The notification icon is absent.");
  assert.ok(css.includes(".brandVersion{"),"Version styling is absent.");
  assert.ok(!css.includes(".topActions .pill{display:none}"),"The mobile version is being hidden.");
});

test("Bluefy rescue entry uses unique asset paths on the same origin",()=>{
  const dir=resolve(".webapp-build"),meta=JSON.parse(readFileSync(resolve(dir,"version.json"),"utf8"));
  const html=readFileSync(resolve(dir,"index.html"),"utf8");
  const rescue=readFileSync(resolve(dir,"bluefy-"+meta.version.replace(/\./g,"")+".html"),"utf8");
  assert.equal(rescue,html);
  assert.ok(html.includes("app-"+meta.buildId+".js"));
  assert.ok(html.includes("styles-"+meta.buildId+".css"));
  assert.equal(readFileSync(resolve(dir,"app-"+meta.buildId+".js"),"utf8"),readFileSync(resolve(dir,"app.js"),"utf8"));
  assert.equal(readFileSync(resolve(dir,"styles-"+meta.buildId+".css"),"utf8"),readFileSync(resolve(dir,"styles.css"),"utf8"));
  const sw=readFileSync(resolve(dir,"sw.js"),"utf8");
  assert.ok(sw.includes("app-"+meta.buildId+".js"));
});

test("Hot Refresh uses same-origin recovery without deleting databases or voice caches",()=>{
 const dir=resolve(".webapp-build"),app=readFileSync(resolve(dir,"app.js"),"utf8"),page=readFileSync(resolve(dir,"force-update.html"),"utf8");
 assert.ok(app.includes('id="forceAppCacheUpdate"'));
 assert.ok(app.includes('on("forceAppCacheUpdate",forceAppCacheUpdate)'));
 assert.ok(page.includes('key.startsWith("resurgo-fitness-static-")'));
 assert.ok(!page.includes("deleteDatabase("));
 assert.ok(!page.includes(".unregister("));
 assert.ok(page.includes('location.replace(entry'));
});

test("live dashboard and source controls are compiled",()=>{
 const source=readFileSync(resolve(".webapp-build/app.js"),"utf8"),css=readFileSync(resolve(".webapp-build/styles.css"),"utf8");
 assert.ok(source.includes("function sourceManager"));assert.ok(source.includes("function liveFreeCue"));assert.ok(source.includes("resurgo_indoor_timer"));assert.ok(css.includes(".liveMetrics{display:grid;grid-template-columns:repeat(2"));
});

test("coach audio is non-exclusive and releases the clip; background gaps are recorded",()=>{const app=readFileSync(resolve(".webapp-build/app.js"),"utf8");assert.ok(app.includes('navigator.audioSession.type=type'));assert.ok(app.includes('audio.onended='));assert.ok(app.includes('requestBackgroundConnection({deviceId:id})'));assert.ok(app.includes("measurementGapSeconds"));});

test("iOS coach uses an audible default, reuses media and preserves tap activation",()=>{const app=readFileSync(resolve(".webapp-build/app.js"),"utf8"),sw=readFileSync(resolve(".webapp-build/sw.js"),"utf8");assert.ok(app.includes('audioModeRevision===2'));assert.ok(app.includes('coachVoiceAudio||(coachVoiceAudio=new Audio())'));assert.ok(app.includes('audio.muted=false'));assert.ok(app.includes('state.ui.view="coachLive";liveSpeech("start");await save()'));assert.ok(sw.includes('status:206'));assert.ok(sw.includes('coachAudioResponse(event.request)'));});

test("padded voice pack contains all original clips with one second either side",()=>{
 const dir=resolve(".webapp-build/voice/fr-FR"),old=JSON.parse(readFileSync(resolve(dir,"v2/manifest.json"),"utf8")),padded=JSON.parse(readFileSync(resolve(dir,"v2-padded/manifest.json"),"utf8"));
 assert.deepEqual(padded.paddingSeconds,{before:1,after:1});assert.notEqual(padded.packId,old.packId);
 assert.deepEqual(Object.keys(padded.files),Object.keys(old.files));
 for(const [key,file] of Object.entries(padded.files)){assert.equal(file.text,old.files[key].text);assert.equal(readFileSync(resolve(dir,"v2-padded",file.src)).length,file.bytes);assert.notEqual(file.sha256,old.files[key].sha256);}
});
