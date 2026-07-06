  // Regrouper ici la logique métier de planification,
  // d'état persistant et de progression des séances.
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
  const familyLabel=f=>familyLabels[f]||f;
  function weekWindowDays(p){ return Number(p.availabilityDays)===7 ? 7 : 5; }
  function kneeCare(p){ const load=Math.max(p.health.kneePain??0,p.health.tendonPain??0); return load>=2; }
  function protectionMode(p){ const pain=Math.max(p.health.backPain||0,p.health.kneePain||0,p.health.tendonPain||0); return p.health.irradiating||p.health.neurological||pain>=3||(p.health.fatigue||0)>=5; }
  function targetSessionCount(p, completed=[]){
    const windowDays=weekWindowDays(p), done=completed.length, pain=Math.max(p.health.backPain||0,p.health.kneePain||0,p.health.tendonPain||0), fatigue=p.health.fatigue||0;
    let target=3;
    if(windowDays===7) target++;
    if((Number(p.startWeightKg)||0)>(Number(p.targetWeightKg)||0)) target++;
    if(p.levels.running==="R0"||p.levels.legs==="J0") target--;
    if(pain>=2||fatigue>=4) target--;
    if(pain>=3||fatigue>=5||p.health.irradiating||p.health.neurological) target=2;
    if(kneeCare(p)) target=Math.min(target,3);
    if(done>=3&&pain<=1&&fatigue<=2) target++;
    return Math.max(2,Math.min(windowDays===7?5:4,target));
  }
  function normalizeGoal(p){ const loss=(Number(p.startWeightKg)||0)-(Number(p.targetWeightKg)||0), minMonths=6, maxKgMonth=5, needed=loss>0?Math.ceil(loss/maxKgMonth):minMonths; p.targetMonths=Math.max(minMonths,needed,Math.round(Number(p.targetMonths)||minMonths)); p.availabilityDays=weekWindowDays(p); p.equipment="Poids du corps, chaise ou banc, élastique"; return p; }
  function goalInfo(p){ normalizeGoal(p); const loss=(Number(p.startWeightKg)||0)-(Number(p.targetWeightKg)||0), monthly=loss>0?loss/p.targetMonths:0; return {loss,monthly,months:p.targetMonths,text:loss>0?`${loss.toFixed(1)} kg en ${p.targetMonths} mois · ${monthly.toFixed(1)} kg/mois`:"Objectif maintien ou recomposition",safe:monthly<=5}; }
  function addDaysIso(base,days){ const d=new Date(`${base}T12:00:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
  function dayLabel(iso){ return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"2-digit"}); }
  function scheduleOffsets(days,windowDays=5){ const maps=windowDays===7?{1:[0],2:[0,3],3:[0,2,4],4:[0,2,4,6],5:[0,1,3,5,6]}:{1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,4]}; return maps[days]||maps[3]; }
  function weekAnchor(){ const items=weekPlan(); return items[0]?.weekStart||items[0]?.date||TODAY; }
  function weekAgenda(p){ const anchor=weekAnchor(), items=weekPlan().filter(s=>s.weekStart===anchor||!s.weekStart), byDate=new Map(items.map(s=>[s.date||anchor,s])), length=weekWindowDays(p); return Array.from({length},(_,i)=>{const date=addDaysIso(anchor,i); return {date,session:byDate.get(date)};}); }
  function dateDiffDays(a,b){ return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000); }
  function remainingWeekDates(anchor,completed,windowDays=5){ const occupied=new Set(completed.map(s=>s.date)); const end=addDaysIso(anchor,windowDays-1), start=TODAY; const span=Math.max(0,dateDiffDays(start,end)); return Array.from({length:span+1},(_,i)=>addDaysIso(start,i)).filter(d=>!occupied.has(d)); }
  function todayPlannedSession(){ return plan().find(s=>(s.date||TODAY)===TODAY)||null; }
  function nextPlannedSession(){ return plan().find(s=>(s.date||TODAY)>=TODAY)||plan()[0]||null; }
  function frequencySummary(p){ const items=weekPlan(), windowDays=weekWindowDays(p), active=items.filter(s=>s.type!=="recovery"), done=items.filter(s=>s.completedAt).length, counts=active.reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},{}), rest=Math.max(0,windowDays-active.length); return [`Fenêtre ${windowDays} jours`,`${active.length} séances planifiées`,`${counts.strength||0} muscu`,`${counts.cardio||0} cardio`,`${counts.mobility||0} mobilité/kiné`,`${rest} repos`,`${done} fait`]; }
  function coachPickToday(p){
    const open=plan(); if(!open.length) return {session:null,rest:true,title:"Semaine terminée",reason:"Toutes les séances prévues sont faites. Repos ou marche douce."};
    const anchor=weekAnchor(), end=addDaysIso(anchor,weekWindowDays(p)-1), remainingDays=Math.max(1,dateDiffDays(TODAY,end)+1), today=todayPlannedSession(), overdue=open.filter(s=>(s.date||TODAY)<TODAY), pressure=open.length>=remainingDays;
    const pain=Math.max(p.health.backPain||0,p.health.kneePain||0,p.health.tendonPain||0), fatigue=p.health.fatigue||0, protect=protectionMode(p), knee=kneeCare(p);
    if(today&&!protect) return {session:today,rest:false,title:"Séance du jour",reason:"Elle est prévue aujourd'hui dans la semaine."};
    if(!today&&!overdue.length&&!pressure) return {session:null,rest:true,title:"Repos planifié",reason:`Il reste ${remainingDays} jours pour ${open.length} séance(s). Le repos garde la semaine équilibrée.`};
    const typeDone=weekPlan().filter(s=>s.completedAt).reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},{});
    const typeNeed={strength:0,cardio:0,mobility:0}; weekPlan().forEach(s=>{ if(typeNeed[s.type]!=null) typeNeed[s.type]++; });
    const score=s=>{
      let v=0;
      if((s.date||TODAY)<TODAY) v+=30;
      if((s.date||TODAY)===TODAY) v+=20;
      if(typeNeed[s.type]!=null) v+=(typeNeed[s.type]-(typeDone[s.type]||0))*8;
      if(knee&&s.title.toLowerCase().includes("genou")) v+=30;
      if(protect){ v+=s.type==="mobility"?35:s.type==="cardio"?8:-8; }
      else if(fatigue>=4){ v+=s.type==="mobility"?20:s.type==="strength"?-6:4; }
      else if(pain>=2){ v+=s.type==="mobility"?14:s.type==="cardio"?3:0; }
      if(s.type==="strength") v+=5;
      return v;
    };
    const picked=[...open].sort((a,b)=>score(b)-score(a))[0];
    const reason=knee?"Genou fragile: le coach évite squats, fentes, step et pliométrie, mais garde marche-course ou course très facile sur plat.":protect?"Protection prioritaire: le coach choisit la séance la plus récupératrice utile.":overdue.length?`Rattrapage: ${overdue.length} séance(s) en retard, le coach choisit la plus utile aujourd'hui.`:pressure?`Planning serré: ${open.length} séance(s) pour ${remainingDays} jour(s), le coach évite de perdre le fil.`:"Séance la plus utile pour équilibrer la semaine.";
    return {session:picked,rest:false,title:picked?.date===TODAY?"Séance du jour":"Séance conseillée par le coach",reason};
  }
  function notificationPermission(){ return "Notification" in window ? Notification.permission : "unsupported"; }
  function notificationStatusText(){
    if(!("Notification" in window)) return "Notifications non supportées par ce navigateur.";
    if(Notification.permission==="granted") return "Notifications autorisées.";
    if(Notification.permission==="denied") return "Notifications bloquées dans les réglages du navigateur.";
    return "Autorisation à demander.";
  }
  function todayReminderSession(){ const p=profile(); if(!p) return null; const pick=coachPickToday(p); return pick.rest?null:pick.session; }
  function reminderBody(s){ return s ? `Séance du jour :\n${s.title}` : "Aucune séance active aujourd'hui."; }
  async function updateAppBadge(){
    const s=todayReminderSession(), count=s?1:0;
    try{
      if(count&&navigator.setAppBadge) await navigator.setAppBadge(count);
      else if(navigator.clearAppBadge) await navigator.clearAppBadge();
    }catch{}
  }
  async function clearAppBadge(){ try{ if(navigator.clearAppBadge) await navigator.clearAppBadge(); }catch{} }
  async function showTodayNotification({force=false}={}){
    const s=todayReminderSession();
    if(!s||!("Notification" in window)||Notification.permission!=="granted") return false;
    if(!force&&state.settings.notifications.lastNotifiedDate===TODAY) return false;
    const title="ResurGo Fitness";
    const options={body:reminderBody(s),tag:`resurgo-session-${TODAY}`,renotify:force,icon:"./icon.svg",badge:"./icon.svg",data:{view:"today",sessionId:s.id,date:TODAY}};
    const reg=swRegistration||await navigator.serviceWorker?.ready.catch(()=>null);
    if(reg?.showNotification) await reg.showNotification(title,options);
    else new Notification(title,options);
    state.settings.notifications.lastNotifiedDate=TODAY;
    await updateAppBadge();
    await save();
    return true;
  }
  function nextReminderDelay(){
    const time=state.settings.notifications.reminderTime||"08:00", [h,m]=time.split(":").map(Number), d=new Date();
    d.setHours(Number.isFinite(h)?h:8,Number.isFinite(m)?m:0,0,0);
    if(d<=new Date()) d.setDate(d.getDate()+1);
    return Math.max(1000,d-new Date());
  }
  function scheduleSessionReminder(){
    if(reminderTimer) clearTimeout(reminderTimer);
    reminderTimer=null;
    updateAppBadge();
    if(!state.settings.notifications.enabled||!("Notification" in window)||Notification.permission!=="granted") return;
    reminderTimer=setTimeout(async()=>{ await showTodayNotification(); scheduleSessionReminder(); },nextReminderDelay());
  }
  async function requestSessionNotifications({test=true,silent=false,rerender=true}={}){
    if(!("Notification" in window)){ if(!silent) save("Notifications non supportées sur cet appareil.").then(()=>{ if(rerender) render(); }); return false; }
    const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
    state.settings.notifications.enabled=permission==="granted";
    if(permission==="granted"){
      state.settings.notifications.askedOnInstall=true;
      if(test) await showTodayNotification({force:true});
      await save(silent?"":test?"Notification envoyée.":"Rappels de séance activés.");
      if(rerender) render();
      return true;
    }
    state.settings.notifications.askedOnInstall=true;
    await save(silent?"":"Notifications refusées ou bloquées.");
    if(rerender) render();
    return false;
  }

  function createProfile(){
    const name = text("newProfileName") || `Profil ${state.profiles.length + 1}`;
    const p=normalizeGoal({
      id:uid("profile"),
      name,
      gender:el("newGender")?.value||"male",
      mediaGender:el("newMediaGender")?.value||"male",
      createdAt:new Date().toISOString(),
      age:num("newAge"),
      heightCm:num("newHeight"),
      startWeightKg:num("newWeight"),
      targetWeightKg:num("newTarget"),
      targetMonths:num("newTargetMonths")||6,
      availabilityDays:Number(el("newAvailabilityDays")?.value)===7?7:5,
      equipment:"Poids du corps, chaise ou banc, élastique",
      sportsHistory:"",
      health:{
        backPain:loadScore("newProfileBack"),
        kneePain:loadScore("newProfileKnee"),
        tendonPain:loadScore("newProfileKnee"),
        fatigue:loadScore("newProfileFatigue"),
        irradiating:!!el("newIrradiating")?.checked,
        neurological:!!el("newNeurological")?.checked
      },
      levels:{
        running:el("newLevel_running")?.value||"R1",
        push:el("newLevel_push")?.value||"P1",
        pull:el("newLevel_pull")?.value||"T1",
        legs:el("newLevel_legs")?.value||"J1",
        frontCore:el("newLevel_frontCore")?.value||"G1",
        sideCore:el("newLevel_sideCore")?.value||"L1",
        mobility:el("newLevel_mobility")?.value||"M1"
      },
      dataPreferences:{primaryWeight:"garmin_index_s2",primaryActivities:"garmin",dedup:true}
    });
    state.profiles.push(p); state.activeProfileId=p.id; state.ui.modal=null; state.assessments.push({id:uid("assessment"),profileId:p.id,date:TODAY,tests:clone(p.levels)}); makeWeek(p.id); save("Profil créé.").then(render);
  }
  function makeWeek(pid,short=false,next=false){
    const p=state.profiles.find(x=>x.id===pid); if(!p) return; normalizeGoal(p);
    const protect=protectionMode(p), knee=kneeCare(p);
    const cardio=protect?"brisk_walk":(p.levels.running==="R0"||knee?"run_walk":"easy_run");
    const existing=state.plans.filter(s=>s.profileId===pid), activeKey=activeWeekKey(), currentWeek=existing.filter(s=>(s.weekStart||s.date||TODAY)===activeKey), completed=next?[]:currentWeek.filter(s=>s.completedAt).sort((a,b)=>new Date(`${a.date||TODAY}T12:00:00`)-new Date(`${b.date||TODAY}T12:00:00`));
    const lastWeek=Math.max(0,...existing.map(s=>Number(s.week)||0)), currentWeekNumber=currentWeek[0]?.week||lastWeek||1, anchor=next?TODAY:(completed[0]?.weekStart||currentWeek[0]?.weekStart||TODAY), weekNumber=next?lastWeek+1:currentWeekNumber;
    const windowDays=weekWindowDays(p), days=targetSessionCount(p,completed);
    const kneeStrength=short?["warmup_flow","quad_set","straight_leg_raise","cooldown_breathing"]:["warmup_flow","quad_set","straight_leg_raise","seated_knee_extension","standing_hamstring_curl","cooldown_breathing"];
    const kneeStability=short?["clamshell","hip_abduction_side","cooldown_breathing"]:["warmup_flow","clamshell","hip_abduction_side","glute_bridge","calf_raise","cooldown_breathing"];
    const A=knee?kneeStrength:(short?["warmup_flow","dead_bug","bird_dog","sit_to_stand","cooldown_breathing"]:["warmup_flow","dead_bug","bird_dog","incline_pushup","band_row","sit_to_stand","glute_bridge","cooldown_breathing"]);
    const B=knee?kneeStability:(short?["hip_flexor","thoracic_rotation","bird_dog"]:["hip_flexor","ankle_wall","side_plank_knees","band_pulldown","box_squat","calf_raise"]);
    const C=short?["warmup_flow","low_impact_cardio","cooldown_breathing"]:["warmup_flow",cardio,"cooldown_breathing"];
    const D=knee?(short?["warmup_flow","incline_pushup","band_row","quad_set","cooldown_breathing"]:["warmup_flow","incline_pushup","band_row","quad_set","straight_leg_raise","cooldown_breathing"]):(short?["warmup_flow","incline_pushup","band_row","cooldown_breathing"]:["warmup_flow","incline_pushup","band_row","box_squat","side_plank_knees","cooldown_breathing"]);
    const E=short?["warmup_flow",knee&&!protect?"run_walk":"brisk_walk","cooldown_breathing"]:["warmup_flow",protect?"brisk_walk":knee?"easy_run":"low_impact_cardio","ankle_wall","cooldown_breathing"];
    const F=short?["hip_flexor","ankle_wall","cooldown_breathing"]:["hip_flexor","thoracic_rotation","ankle_wall","hamstring_floss","cooldown_breathing"];
    const G=short?["warmup_flow","thoracic_rotation","cooldown_breathing"]:["warmup_flow","thoracic_rotation","bird_dog","ankle_wall","cooldown_breathing"];
    const sets=[
      [knee?"Renfo genou doux":"Force profonde",short?22:42,knee?"mobility":"strength",A],
      [knee&&!protect?"Marche-course plate":protect?"Cardio protection":"Endurance facile",knee?30:protect?25:35,"cardio",C],
      [knee?"Stabilité genou / rotule":"Renfo mobilité",short?18:34,"mobility",B],
      ["Force complète",short?24:40,"strength",D],
      ["Cardio bas impact",short?22:32,"cardio",E],
      ["Mobilité récupération",short?16:28,"mobility",F],
      ["Récupération active",short?14:24,"mobility",G]
    ].slice(0,days);
    const doneTypes=completed.reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},{});
    const remainingSets=sets.filter(s=>{ if(doneTypes[s[2]]>0){ doneTypes[s[2]]--; return false; } return true; });
    const dates=remainingWeekDates(anchor,completed,windowDays);
    const fallbackDates=scheduleOffsets(Math.max(1,remainingSets.length),windowDays).map(offset=>addDaysIso(anchor,offset));
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
