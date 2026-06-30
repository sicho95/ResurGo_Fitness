{ const d=await db(); return new Promise((ok,ko)=>{ const r=d.transaction(STORE).objectStore(STORE).get(k); r.onsuccess=()=>ok(r.result); r.onerror=()=>ko(r.error); }); }
  async function put(k,v){ const d=await db(); return new Promise((ok,ko)=>{ const r=d.transaction(STORE,"readwrite").objectStore(STORE).put(v,k); r.onsuccess=ok; r.onerror=()=>ko(r.error); }); }
  async function save(msg=""){
    if (msg) {
      state.ui.message = msg;
      if (messageTimer) clearTimeout(messageTimer);
      messageTimer = setTimeout(async () => {
        if (state.ui.message === msg) {
          state.ui.message = "";
          await put("app", state);
          render();
        }
      }, 3000);
    }
    await put("app",state);
  }
  const profile=()=>state.profiles.find(p=>p.id===state.activeProfileId);
  const profilePlans=()=>profile()?state.plans.filter(s=>s.profileId===profile().id).sort((a,b)=>new Date(`${a.date||TODAY}T12:00:00`)-new Date(`${b.date||TODAY}T12:00:00`)):[];
  function activeWeekKey(){ const all=profilePlans(), open=all.filter(s=>!s.completedAt); return (open[0]||all[all.length-1])?.weekStart||TODAY; }
  const weekPlan=()=>profilePlans().filter(s=>(s.weekStart||s.date||TODAY)===activeWeekKey());
  const plan=()=>weekPlan().filter(s=>!s.completedAt);
  const run=()=>state.sessionRuns.find(r=>!r.completedAt&&!r.abortedAt);
  const exercise=id=>ex.find(x=>x.id===id)||ex[0];
  const currentEx=()=>{ const r=run(), s=state.plans.find(x=>x.id===r?.sessionId); return exercise(s?.exerciseIds[r.exerciseIndex]); };
  const latestMetric=()=>{ const p=profile(); const a=p?state.metrics.filter(m=>m.profileId===p.id&&m.weightKg).sort((a,b)=>new Date(a.measuredAt)-new Date(b.measuredAt)):[]; return a[a.length-1]||null; };
  const loadScore = id => { const raw = el(id)?.value; return raw === "" || raw == null ? null : scoreToLoad(Number(raw)); };
  const typeLabel=t=>({strength:"Musculation",cardio:"Course / cardio",mobility:"Mobilité",recovery:"Récupération"}[t]||"Séance");
  function normalizeGoal(p){ const loss=(Number(p.startWeightKg)||0)-(Number(p.targetWeightKg)||0), minMonths=6, maxKgMonth=5, needed=loss>0?Math.ceil(loss/maxKgMonth):minMonths; p.targetMonths=Math.max(minMonths,needed,Math.round(Number(p.targetMonths)||minMonths)); p.availabilityDays=Math.max(1,Math.min(7,Math.round(Number(p.availabilityDays)||3))); return p; }
  function goalInfo(p){ normalizeGoal(p); const loss=(Number(p.startWeightKg)||0)-(Number(p.targetWeightKg)||0), monthly=loss>0?loss/p.targetMonths:0; return {loss,monthly,months:p.targetMonths,text:loss>0?`${loss.toFixed(1)} kg en ${p.targetMonths} mois · ${monthly.toFixed(1)} kg/mois`:"Objectif maintien ou recomposition",safe:monthly<=5}; }
  function addDaysIso(base,days){ const d=new Date(`${base}T12:00:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
  function dayLabel(iso){ return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"2-digit"}); }
  function scheduleOffsets(days){ return ({1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,5],5:[0,1,2,4,5],6:[0,1,2,3,4,5],7:[0,1,2,3,4,5,6]}[days]||[0,2,4]); }
  function weekAnchor(){ const items=weekPlan(); return items[0]?.weekStart||items[0]?.date||TODAY; }
  function weekAgenda(p){ const anchor=weekAnchor(), items=weekPlan().filter(s=>s.weekStart===anchor||!s.weekStart), byDate=new Map(items.map(s=>[s.date||anchor,s])); return Array.from({length:7},(_,i)=>{const date=addDaysIso(anchor,i); return {date,session:byDate.get(date)};}); }
  function dateDiffDays(a,b){ return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000); }
  function remainingWeekDates(anchor,completed){ const occupied=new Set(completed.map(s=>s.date)); const end=addDaysIso(anchor,6), start=TODAY; const span=Math.max(0,dateDiffDays(start,end)); return Array.from({length:span+1},(_,i)=>addDaysIso(start,i)).filter(d=>!occupied.has(d)); }
  function todayPlannedSession(){ return plan().find(s=>(s.date||TODAY)===TODAY)||null; }
  function nextPlannedSession(){ return plan().find(s=>(s.date||TODAY)>=TODAY)||plan()[0]||null; }
  function frequencySummary(p){ const items=weekPlan(), active=items.filter(s=>s.type!=="recovery"), done=items.filter(s=>s.completedAt).length, counts=active.reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},{}), rest=Math.max(0,7-active.length); return [`${active.length}/${7} jours actifs`,`${counts.strength||0} muscu`,`${counts.cardio||0} course/cardio`,`${counts.mobility||0} mobilité`,`${rest} repos`,`${done} fait`]; }
  function coachPickToday(p){
    const open=plan(); if(!open.length) return {session:null,rest:true,title:"Semaine terminée",reason:"Toutes les séances prévues sont faites. Repos ou marche douce."};
    const anchor=weekAnchor(), end=addDaysIso(anchor,6), remainingDays=Math.max(1,dateDiffDays(TODAY,end)+1), today=todayPlannedSession(), overdue=open.filter(s=>(s.date||TODAY)<TODAY), pressure=open.length>=remainingDays;
    const pain=Math.max(p.health.backPain||0,p.health.kneePain||0,p.health.tendonPain||0), fatigue=p.health.fatigue||0, protect=p.health.irradiating||p.health.neurological||pain>=3||fatigue>=5;
    if(today&&!protect) return {session:today,rest:false,title:"Séance du jour",reason:"Elle est prévue aujourd'hui dans la semaine."};
    if(!today&&!overdue.length&&!pressure) return {session:null,rest:true,title:"Repos planifié",reason:`Il reste ${remainingDays} jours pour ${open.length} séance(s). Le repos garde la semaine équilibrée.`};
    const typeDone=weekPlan().filter(s=>s.completedAt).reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},{});
    const typeNeed={strength:0,cardio:0,mobility:0}; weekPlan().forEach(s=>{ if(typeNeed[s.type]!=null) typeNeed[s.type]++; });
    const score=s=>{
      let v=0;
      if((s.date||TODAY)<TODAY) v+=30;
      if((s.date||TODAY)===TODAY) v+=20;
      if(typeNeed[s.type]!=null) v+=(typeNeed[s.type]-(typeDone[s.type]||0))*8;
      if(protect){ v+=s.type==="mobility"?35:s.type==="cardio"?8:-8; }
      else if(fatigue>=4){ v+=s.type==="mobility"?20:s.type==="strength"?-6:4; }
      else if(pain>=2){ v+=s.type==="mobility"?14:s.type==="cardio"?3:0; }
      if(s.type==="strength") v+=5;
      return v;
    };
    const picked=[...open].sort((a,b)=>score(b)-score(a))[0];
    const reason=protect?"Protection prioritaire: le coach choisit la séance la plus récupératrice utile.":overdue.length?`Rattrapage: ${overdue.length} séance(s) en retard, le coach choisit la plus utile aujourd'hui.`:pressure?`Planning serré: ${open.length} séance(s) pour ${remainingDays} jour(s), le coach évite de perdre le fil.`:"Séance la plus utile pour équilibrer la semaine.";
    return {session:picked,rest:false,title:picked?.date===TODAY?"Séance du jour":"Séance conseillée par le coach",reason};
  }

  function createProfile(){
    const name = text("newProfileName") || `Profil ${state.profiles.length + 1}`;
    const p=normalizeGoal({ id:uid("profile"), name, gender:el("newGender")?.value||"male", createdAt:new Date().toISOString(), age:num("newAge"), heightCm:num("newHeight"), startWeightKg:num("newWeight"), targetWeightKg:num("newTarget"), targetMonths:num("newTargetMonths")||6, availabilityDays:3, equipment:"élastique, chaise, tapis", sportsHistory:"", health:{backPain:null,kneePain:null,tendonPain:null,fatigue:null,irradiating:false,neurological:false}, levels:{running:"R1",push:"P1",pull:"T1",legs:"J1",frontCore:"G1",sideCore:"L1",mobility:"M1"}, dataPreferences:{primaryWeight:"garmin_index_s2",primaryActivities:"garmin",dedup:true} });
    state.profiles.push(p); state.activeProfileId=p.id; state.ui.modal=null; state.assessments.push({id:uid("assessment"),profileId:p.id,date:TODAY,tests:clone(p.levels)}); makeWeek(p.id); save("Profil créé.").then(render);
  }
  function makeWeek(pid,short=false,next=false){
    const p=state.profiles.find(x=>x.id===pid); if(!p) return;
    const protect=p.health.backPain>=3||p.health.kneePain>=3||p.health.tendonPain>=3||p.health.irradiating||p.health.neurological;
    const cardio=protect?"brisk_walk":(p.levels.running==="R0"?"run_walk":"easy_run");
    const existing=state.plans.filter(s=>s.profileId===pid), activeKey=activeWeekKey(), currentWeek=existing.filter(s=>(s.weekStart||s.date||TODAY)===activeKey), completed=next?[]:currentWeek.filter(s=>s.completedAt).sort((a,b)=>new Date(`${a.date||TODAY}T12:00:00`)-new Date(`${b.date||TODAY}T12:00:00`));
    const lastWeek=Math.max(0,...existing.map(s=>Number(s.week)||0)), currentWeekNumber=currentWeek[0]?.week||lastWeek||1, anchor=next?TODAY:(completed[0]?.weekStart||currentWeek[0]?.weekStart||TODAY), weekNumber=next?lastWeek+1:currentWeekNumber;
    const days=Math.max(1,Math.min(7,Math.round(Number(p.availabilityDays)||3)));
    const A=short?["warmup_flow","dead_bug","bird_dog","sit_to_stand","cooldown_breathing"]:["warmup_flow","dead_bug","bird_dog","incline_pushup","band_row","sit_to_stand","glute_bridge","cooldown_breathing"];
    const B=short?["hip_flexor","thoracic_rotation","bird_dog"]:["hip_flexor","ankle_wall","side_plank_knees","band_pulldown","box_squat","calf_raise"];
    const C=short?["warmup_flow","low_impact_cardio","cooldown_breathing"]:["warmup_flow",cardio,"cooldown_breathing"];
    const D=short?["warmup_flow","incline_pushup","band_row","cooldown_breathing"]:["warmup_flow","incline_pushup","band_row","box_squat","side_plank_knees","cooldown_breathing"];
    const E=short?["warmup_flow","brisk_walk","cooldown_breathing"]:["warmup_flow",protect?"brisk_walk":"low_impact_cardio","ankle_wall","cooldown_breathing"];
    const F=short?["hip_flexor","ankle_wall","cooldown_breathing"]:["hip_flexor","thoracic_rotation","ankle_wall","hamstring_floss","cooldown_breathing"];
    const G=short?["warmup_flow","thoracic_rotation","cooldown_breathing"]:["warmup_flow","thoracic_rotation","bird_dog","ankle_wall","cooldown_breathing"];
    const sets=[
      ["Force profonde",short?22:42,"strength",A],
      [protect?"Cardio protection":"Endurance facile",protect?25:35,"cardio",C],
      ["Renfo mobilité",short?18:34,"mobility",B],
      ["Force complète",short?24:40,"strength",D],
      ["Cardio bas impact",short?22:32,"cardio",E],
      ["Mobilité récupération",short?16:28,"mobility",F],
      ["Récupération active",short?14:24,"mobility",G]
    ].slice(0,days);
    const doneTypes=completed.reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},{});
    const remainingSets=sets.filter(s=>{ if(doneTypes[s[2]]>0){ doneTypes[s[2]]--; return false; } return true; });
    const dates=remainingWeekDates(anchor,completed);
    const fallbackDates=scheduleOffsets(Math.max(1,remainingSets.length)).map((_,i)=>addDaysIso(TODAY,i));
    state.plans=state.plans.filter(s=>!(s.profileId===pid&&!s.completedAt));
    state.plans.push(...remainingSets.slice(0,Math.max(1,dates.length||remainingSets.length)).map((s,i)=>({id:uid(`session${i}`),profileId:pid,title:s[0],minutes:s[1],type:s[2],phase:1,week:weekNumber,weekStart:anchor,date:dates[i]||fallbackDates[i]||TODAY,dayIndex:completed.length+i+1,exerciseIds:s[3],short,completedAt:null})));
  }
  function decision(p){
    const planned=state.plans.filter(s=>s.profileId===p.id), done=planned.filter(s=>s.completedAt).length, adh=planned.length?done/planned.length:0;
    const scores=[p.health.backPain,p.health.kneePain,p.health.tendonPain].filter(v=>v!=null);
    const pain=scores.length?Math.max(...scores):0;
    const fatigue=p.health.fatigue ?? 0;
    const hasCheck=scores.length>0||p.health.fatigue!=null||p.health.irradiating||p.health.neurological;
    if(!done && !hasCheck) return ["blue","Démarrage","Base installée. Renseigne le check rapide puis lance la première semaine."];
    if(p.health.irradiating||p.health.neurological||pain>=3||fatigue>=5) return ["red","Protection","Douleur ou fatigue élevée : priorité à la sécurité, au repos et à la mobilité."];
    if(adh<.4||fatigue>=4) return ["orange","Semaine minimale viable","Volume réduit pour garder l'habitude sans surcharger."];
    if(adh>=.65&&pain<=2&&fatigue<=3) return ["green","Progression","Semaine normale et légère progression possibles si tout reste propre."];
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
