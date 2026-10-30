import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";

const dir=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(dir,"../app/backup-secure.js"),"utf8");

function runner() {
  const store=new Map();
  const messages=[];
  const captured={blob:null};
  const inputs=new Map([
    ["backupPassword",{value:"une phrase de passe tres longue"}],
    ["backupPasswordConfirm",{value:"une phrase de passe tres longue"}],
    ["backupRestorePassword",{value:"une phrase de passe tres longue"}],
    ["restoreEncryptedJson",{value:""}]
  ]);
  const document={
    body:{append(){}},
    createElement(){return {click(){},remove(){}};}
  };
  class TestURL extends URL {
    static createObjectURL(blob){captured.blob=blob;return "blob:backup-test"}
    static revokeObjectURL(){}
  }
  const initial={
    profiles:[{id:"profil-001",name:"Profil fictif TEST"}],
    plans:[{id:"plan-001",profileId:"profil-001",title:"Sortie facile"}],
    activities:[{id:"activite-001",profileId:"profil-001",distanceM:3000}],
    sessionRuns:[],metrics:[{id:"mesure-001",weightKg:77}],
    settings:{workerUrl:"https://example.invalid",workerToken:"SECRET-A-NE-PAS-EXPORTER",
      tts:{enabled:true},notifications:{enabled:false}},
    ui:{view:"settings",message:"Test en cours",modal:null}
  };
  const ctx=vm.createContext({
    crypto:webcrypto,Blob,URL:TestURL,TextEncoder,TextDecoder,Uint8Array,Date,
    btoa:buffer=>Buffer.from(buffer,"binary").toString("base64"),
    atob:buffer=>Buffer.from(buffer,"base64").toString("binary"),
    document,isSecureContext:true,APP_VERSION:"1.3.4",empty:structuredClone(initial),
    state:structuredClone(initial),
    el:(id)=>inputs.get(id)||null,clone:structuredClone,
    get:async(k)=>store.get(k)||null,
    put:async(k,v)=>{store.set(k,v);},
    save:async()=>{},render:()=>{},alert:msg=>messages.push(msg),
    confirm:()=>true,
    setTimeout:()=>0,clearTimeout:()=>{},
    fetch:()=>{throw Error("Pas d'accès réseau dans ce test.");}
  });
  vm.runInContext(source+"\n globalThis.__api={exportEncryptedBackup,restoreEncryptedBackup,backupDerive};",ctx);
  return {ctx,inputs,store,messages,captured,initial,api:ctx.__api};
}

test("une sauvegarde chiffrée inclut tous les tableaux et aucun token de session",async()=>{
  const r=runner();
  await r.api.exportEncryptedBackup();
  assert.ok(r.captured.blob);
  const envelope=JSON.parse(await r.captured.blob.text());
  assert.equal(envelope.format,"resurgo-encrypted-backup");
  assert.equal(envelope.version,2);
  assert.equal(envelope.cipher.name,"AES-256-GCM");
  assert.equal(envelope.kdf.iterations,310000);
  assert.equal(envelope.ciphertext.includes("SECRET-A-NE-PAS-EXPORTER"),false);
  assert.equal(JSON.stringify(envelope).includes("Profil fictif TEST"),false);
  assert.equal(r.inputs.get("backupPassword").value,"");
  const original=JSON.stringify(r.ctx.state);
  assert.ok(original.includes("SECRET-A-NE-PAS-EXPORTER")); // source locale intacte.
});

test("restauration par mot de passe après perte locale, sans réseau NAS",async()=>{
  const r=runner();
  await r.api.exportEncryptedBackup();
  const json=await r.captured.blob.text();
  r.ctx.state.profiles=[];
  r.ctx.state.plans=[];
  await r.api.restoreEncryptedBackup(new Blob([json],{type:"application/json"}));
  assert.equal(r.ctx.state.profiles[0].name,"Profil fictif TEST");
  assert.equal(r.ctx.state.activities[0].distanceM,3000);
  assert.equal(r.ctx.state.settings.workerToken,"");
  assert.equal(r.store.get("app").profiles[0].id,"profil-001");
  assert.equal(r.store.get("nasConnection"),null); // session NAS précédente effacée.
  assert.match(r.messages.join(" "),/restaurée/);
});

test("mauvais mot de passe : refuse sans modifier les données locales",async()=>{
  const r=runner();
  await r.api.exportEncryptedBackup();
  const json=await r.captured.blob.text();
  r.inputs.get("backupRestorePassword").value="mot de passe incorrect";
  r.ctx.state.profiles=[];
  await r.api.restoreEncryptedBackup(new Blob([json]));
  assert.equal(r.ctx.state.profiles.length,0);
  assert.match(r.messages.join(" "),/Mot de passe incorrect/);
});

test("fichier falsifié : échec authentification AES-GCM",async()=>{
  const r=runner();
  await r.api.exportEncryptedBackup();
  const envelope=JSON.parse(await r.captured.blob.text());
  const chars=envelope.ciphertext.split("");
  chars[12]=chars[12]==="a"?"b":"a";
  envelope.ciphertext=chars.join("");
  r.ctx.state.profiles=[];
  await r.api.restoreEncryptedBackup(new Blob([JSON.stringify(envelope)]));
  assert.equal(r.ctx.state.profiles.length,0);
  assert.match(r.messages.join(" "),/fichier altéré/);
});

test("la sauvegarde chiffrée peut porter une clé de récupération sans le jeton",async()=>{
  const r=runner();
  r.store.set("nasConnection",{
    url:"https://nas.example.invalid",profileId:"nas-profile",deviceId:"old-device",
    token:"SESSION-TOKEN-SUPER-SECRET",recovery:{keyId:"key-001",secret:"RECOVERY-SECRET-LONG"},
    label:"iPhone"
  });
  await r.api.exportEncryptedBackup();
  const envelope=JSON.parse(await r.captured.blob.text());
  const key=await r.api.backupDerive(r.inputs.get("backupRestorePassword").value,
    Uint8Array.from(Buffer.from(envelope.kdf.salt,"base64")),envelope.kdf.iterations);
  const plaintext=new TextDecoder().decode(await webcrypto.subtle.decrypt(
    {name:"AES-GCM",iv:Uint8Array.from(Buffer.from(envelope.cipher.iv,"base64"))},
    key,Uint8Array.from(Buffer.from(envelope.ciphertext,"base64"))));
  const payload=JSON.parse(plaintext);
  assert.equal(payload.nas.profileId,"nas-profile");
  assert.equal(payload.nas.recovery.secret,"RECOVERY-SECRET-LONG");
  assert.equal(plaintext.includes("SESSION-TOKEN-SUPER-SECRET"),false);
  assert.equal(plaintext.includes("old-device"),false);
});

test("restauration NAS : nouveau jeton, jamais le mot de passe ou l'ancien token envoyé",async()=>{
  const r=runner();
  r.store.set("nasConnection",{
    url:"https://nas.example.invalid",profileId:"profil-nas",deviceId:"ancien",
    token:"OLD_TOKEN",recovery:{keyId:"key-001",secret:"SECURE_RECOVERY_48_BYTES_RANDOM_SECRET"},
    label:"Ancien iPhone"
  });
  await r.api.exportEncryptedBackup();
  const encrypted=await r.captured.blob.text();
  let request=null;
  r.ctx.fetch=async (url,options)=>{
    request={url,options};
    return {ok:true,status:200,json:async()=>({
      profileId:"profil-nas",deviceId:"nouveau",
      token:"NEW_TOKEN",
      recovery:{keyId:"key-002",secret:"NEW_SECURE_RECOVERY_SECRET"}
    })};
  };
  r.ctx.state.profiles=[];
  await r.api.restoreEncryptedBackup(new Blob([encrypted]));
  assert.equal(r.ctx.state.profiles[0].id,"profil-001");
  assert.equal(r.store.get("nasConnection").token,"NEW_TOKEN");
  assert.equal(r.store.get("nasConnection").deviceId,"nouveau");
  assert.equal(r.store.get("nasConnection").recovery.keyId,"key-002");
  assert.equal(request.url,"https://nas.example.invalid/api/v1/recovery/redeem");
  assert.equal(JSON.stringify(request.options).includes("OLD_TOKEN"),false);
  assert.equal(JSON.stringify(request.options).includes("une phrase de passe tres longue"),false);
  assert.equal(JSON.parse(request.options.body).secret,"SECURE_RECOVERY_48_BYTES_RANDOM_SECRET");
});
