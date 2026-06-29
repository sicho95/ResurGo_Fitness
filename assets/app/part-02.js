{ const d=await db(); return new Promise((ok,ko)=>{ const r=d.transaction(STORE).objectStore(STORE).get(k); r.onsuccess=()=>ok(r.result); r.onerror=()=>ko(r.error); }); }
  async function put(k,v){ const d=await db(); return new Promise((ok,ko)=>{ const r=d.transaction(STORE,"readwrite").objectStore(STORE).put(v,k); r.onsuccess=ok; r.onerror=()=>ko(r.error); }); }
  async function save(msg=""){ if(msg) state.ui.message=msg; await put("app",state); }
  const profile=()=>state.profiles.find(p=>p.id===state.activeProfileId);
  const plan=()=>profile()?state.plans.filter(s=>s.profileId===profile().id&&!s.completedAt):[];
  const run=()=>state.sessionRuns.find(r=>!r.completedAt&&!r.abortedAt);
  const exercise=id=>ex.find(x=>x.id===id)||ex[0];
  const currentEx=()=>{ const r=run(), s=state.plans.find(x=>x.id===r?.sessionId); return exercise(s?.exerciseIds[r.exerciseIndex]); };
  const latestMetric=()=>{ const p=profile(); const a=p?state.metrics.filter(m=>m.profileId===p.id&&m.weightKg).sort((a,b)=>new Date(a.measuredAt)-new Date(b.measuredAt)):[]; return a[a.length-1]||null; };

  function createProfile(){
    const name = text("newProfileName") || `Profil ${state.profiles.length + 1}`;
    const p={ id:uid("profile"), name, gender:el("newGender")?.value||"male", createdAt:new Date().toISOString(), age:n("newAge")||null, heightCm:n("newHeight")||null, startWeightKg:n("newWeight")||null, targetWeightKg:n("newTarget")||null, availabilityDays:3, equipment:"élastique, chaise, tapis", sportsHistory:"", health:{backPain:0,kneePain:0,tendonPain:0,fatigue:1,irradiating:false,neurological:false}, levels:{running:"R1",push:"P1",pull:"T1",legs:"J1",frontCore:"G1",sideCore:"L1",mobility:"M1"}, dataPreferences:{primaryWeight:"garmin_index_s2",primaryActivities:"garmin",dedup:true} };
    state.profiles.push(p); state.activeProfileId=p.id; state.assessments.push({id:uid("assessment"),profileId:p.id,date:TODAY,tests:clone(p.levels)}); makeWeek(p.id); save("Profil créé.").then(render);
  }
  function makeWeek(pid,short=false){
    const p=state.profiles.find(x=>x.id===pid); if(!p) return;
    const protect=p.health.backPain>=3||p.health.kneePain>=3||p.health.tendonPain>=3||p.health.irradiating||p.health.neurological;
    const cardio=protect?"brisk_walk":(p.levels.running==="R0"?"run_walk":"easy_run");
    const A=short?["warmup_flow","dead_bug","bird_dog","sit_to_stand","cooldown_breathing"]:["warmup_flow","dead_bug","bird_dog","incline_pushup","band_row","sit_to_stand","glute_bridge","cooldown_breathing"];
    const B=short?["hip_flexor","thoracic_rotation","bird_dog"]:["hip_flexor","ankle_wall","side_plank_knees","band_pulldown","box_squat","calf_raise"];
    const C=short?["warmup_flow","low_impact_cardio","cooldown_breathing"]:["warmup_flow",cardio,"cooldown_breathing"];
    const sets=[["Force profonde",short?22:42,"strength",A], [protect?"Cardio protection":"Endurance facile",protect?25:35,"cardio",C], ["Renfo mobilité",short?18:34,"mobility",B]];
    state.plans=state.plans.filter(s=>!(s.profileId===pid&&!s.completedAt));
    state.plans.push(...sets.map((s,i)=>({id:uid(`session${i}`),profileId:pid,title:s[0],minutes:s[1],type:s[2],phase:1,week:1,date:TODAY,exerciseIds:s[3],short,completedAt:null})));
  }
  function decision(p){
    const planned=state.plans.filter(s=>s.profileId===p.id), done=planned.filter(s=>s.completedAt).length, adh=planned.length?done/planned.length:0, pain=Math.max(p.health.backPain,p.health.kneePain,p.health.tendonPain);
    if(p.health.irradiating||p.health.neurological||pain>=3||p.health.fatigue>=5) return ["red","Protection","Douleur/fatigue élevée : mobilité, marche, gainage profond, aucune progression."];
    if(adh<.4||p.health.fatigue>=4) return ["orange","Correction","Semaine minimale viable et reprise du rythme."];
    if(adh>=.65&&pain<=2&&p.health.fatigue<=3) return ["green","Progression","Augmentation légère possible la semaine suivante."];
    return ["blue","Maintien","Répéter proprement sans chercher la performance."];
  }
  function start(id){ const s=state.plans.find(x=>x.id===id); if(!s) return; state.sessionRuns=state.sessionRuns.filter(x=>x.completedAt||x.abortedAt); state.sessionRuns.push({id:uid("run"),profileId:s.profileId,sessionId:s.id,exerciseIndex:0,setIndex:0,mode:"work",logs:[],safetyAlerts:[],startedAt:new Date().toISOString(),completedAt:null,abortedAt:null}); state.ui.view="session"; speakExerciseGuide(currentEx(),"Prochain exercice."); save("Séance lancée.").then(render); }
  function log(success,pain,difficulty){
    stopTimer(); const r=run(), s=state.plans.find(x=>x.id===r?.sessionId), x=currentEx(); if(!r||!s||!x) return;
    r.logs.push({exerciseId:x.id,set:r.setIndex+1,success,pain,difficulty,at:new Date().toISOString()});
    if(pain>=3){r.safetyAlerts.push(`${x.name}: douleur ${pain}/5`); speak("Alerte sécurité. Stop ou version plus facile.","safety");}
    const doneEx=pain>=3||success==="stop"||r.setIndex+1>=x.sets;
    if(doneEx&&r.exerciseIndex+1>=s.exerciseIds.length){r.completedAt=s.completedAt=new Date().toISOString(); r.mode="done"; state.activities.push({id:uid("activity"),profileId:r.profileId,source:"manual",type:s.type,startedAt:r.startedAt,durationSeconds:s.minutes*60,sessionRunId:r.id}); state.ui.view="stats"; speak("Séance terminée. Résumé enregistré.");}
    else if(doneEx){r.mode="resting"; r.restNext={exerciseIndex:r.exerciseIndex+1,setIndex:0,label:`Exercice suivant : ${exercise(s.exerciseIds[r.exerciseIndex+1]).name}`}; startRest(x.rest||30);}
    else {r.mode="resting"; r.restNext={exerciseIndex:r.exerciseIndex,setIndex:r.setIndex+1,label:`Série suivante : ${r.setIndex+2} sur ${x.sets}`}; startRest(x.rest||30);}
    save("Résultat enregistré.").then(render);
  }
  function voiceUtterance(t,done){ const u=new SpeechSynthesisUtterance(t); u.lang="fr-FR"; u.rate=state.settings.tts.rate; u.pitch=state.settings.tts.pitch; u.volume=state.settings.tts.volume; if(done) u.onend=done; return u; }
  function speak(t,kind="cue"){ if((!state.settings.tts.enabled&&kind!=="safety")||!("speechSynthesis" in window)) return; if(kind==="safety"){ voiceSeq++; speechSynthesis.cancel(); } speechSynthesis.speak(voiceUtterance(t)); }
  function speakSequence(parts,kind="cue",gap=650){ if((!state.settings.tts.enabled&&kind!=="safety")||!("speechSynthesis" in window)) return; const list=parts.map(x=>String(x||"").trim()).filter(Boolean); if(!list.length) return; const token=++voiceSeq; speechSynthesis.cancel(); let i=0; const next=()=>{ if(token!==voiceSeq||i>=list.length) return; speechSynthesis.speak(voiceUtterance(list[i++],()=>setTimeout(next,gap))); }; next(); }
  function speakExerciseGuide(x,prefix=""){ if(!x||!state.settings.tts.cues) return; const parts=[`${prefix} ${x.name}. ${x.short}`,...x.steps.map((s,i)=>`Consigne ${i+1}. ${s}`),`Sécurité. ${x.safety}`]; speakSequence(parts,"cue",650); }
  function startTimer(){ const x=currentEx(); if(!x) return; if(x.type!=="time"){speakExerciseGuide(x,"Rappel."); return