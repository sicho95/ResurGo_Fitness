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
    "restoreEncryptedBackup","sensorAccept","chooseSensorMetric",
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
  const pushRow={dataset:{openPush:"push_123"}};
  const sessionRow={dataset:{pushSession:"session_123"}};
  const documentStub={
    getElementById:id=>id==="pushInboxButton"?inboxButton:null,
    querySelectorAll:selector=>({
      "[data-view]":[bottomTab],
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
