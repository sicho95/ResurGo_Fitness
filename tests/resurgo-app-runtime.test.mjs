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
