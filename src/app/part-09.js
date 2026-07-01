    }catch{}
    render();
  }
  function registerPwaEvents(){
    window.addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); deferredInstallPrompt=e; render(); });
    window.addEventListener("appinstalled",async()=>{ deferredInstallPrompt=null; state.settings.hideInstallPrompt=true; await save("App installée."); render(); if(state.settings.notifications.enabled&&notificationPermission()==="default"&&!state.settings.notifications.askedOnInstall) await requestSessionNotifications({test:false,silent:true}); });
    navigator.serviceWorker?.addEventListener("message", e=>{ if(e.data?.type==="OPEN_VIEW"){ state.ui.view=e.data.view||"today"; save().then(render); } });
    let refreshing=false;
    navigator.serviceWorker?.addEventListener("controllerchange",()=>{ if(refreshing) return; refreshing=true; window.location.reload(); });
  }
  async function registerServiceWorker(){
    if(!("serviceWorker" in navigator)) return;
    swRegistration=await navigator.serviceWorker.register("./sw.js").catch(()=>null);
    if(!swRegistration) return;
    if(swRegistration.waiting){ updateWaiting=swRegistration.waiting; applyHotUpdate(); }
    swRegistration.addEventListener("updatefound",()=>{ const nw=swRegistration.installing; if(!nw) return; nw.addEventListener("statechange",()=>{ if(nw.state==="installed"&&navigator.serviceWorker.controller){ updateWaiting=nw; applyHotUpdate(); } }); });
    await checkOnlineVersion();
    scheduleSessionReminder();
  }
  function saveQuickCheck(silent=true){ const p=profile(); if(!p) return; p.health.backPain=loadScore("quickBack"); p.health.kneePain=loadScore("quickKnee"); p.health.tendonPain=loadScore("quickKnee"); p.health.fatigue=loadScore("quickFatigue"); save(silent?"":"Check rapide enregistré."); }
  function saveProfileFields({regen=false,msg=""}={}){
    const p=profile(); if(!p) return;
    p.name=text("profileName")||p.name; p.gender=el("gender")?.value||p.gender||"male"; p.age=num("age")??p.age; p.heightCm=num("heightCm")??p.heightCm; p.startWeightKg=num("startWeightKg")??p.startWeightKg; p.targetWeightKg=num("targetWeightKg")??p.targetWeightKg; p.targetMonths=num("targetMonths")??p.targetMonths??6; p.availabilityDays=num("availabilityDays")??p.availabilityDays; p.equipment=text("equipment"); p.sportsHistory=text("sportsHistory");
    normalizeGoal(p);
    p.health.backPain=loadScore("profileBack");
    p.health.kneePain=loadScore("profileKnee");
    p.health.tendonPain=loadScore("profileKnee");
    p.health.fatigue=loadScore("profileFatigue");
    p.health.irradiating=!!el("irradiating")?.checked;
    p.health.neurological=!!el("neurological")?.checked;
    Object.keys(levels).forEach(k=>{ const x=el(`level_${k}`); if(x) p.levels[k]=x.value; });
    if(regen) makeWeek(p.id);
    save(msg);
  }
  function saveTtsSettings(){ state.settings.tts.enabled=el("ttsEnabled")?.value==="true"; state.settings.tts.rate=n("ttsRate")||1; state.settings.tts.volume=n("ttsVolume"); save(); }
  function saveWorkerSettings(){ state.settings.workerUrl=text("workerUrl"); state.settings.workerToken=el("workerToken")?.value||""; save(); }
  function saveNotificationSettings(){
    state.settings.notifications.enabled=!!el("notifEnabled")?.checked;
    state.settings.notifications.reminderTime=el("notifTime")?.value||"08:00";
    const stateText=el("notifEnabled")?.nextElementSibling?.querySelector(".switchState");
    if(stateText) stateText.textContent=state.settings.notifications.enabled?"Oui":"Non";
    if(state.settings.notifications.enabled&&notificationPermission()!=="granted") return requestSessionNotifications({test:false});
    save("Rappels mis à jour.").then(()=>{ scheduleSessionReminder(); render(); });
  }
  function confirmTwice(first,second){ return confirm(first)&&confirm(second); }
  function placeSmileyMenu(details){
    const menu=details?.querySelector(".smileyChoices"), summary=details?.querySelector("summary");
    if(!menu||!summary) return;
    menu.style.top=""; menu.style.left=""; menu.style.right=""; menu.style.width=""; menu.style.transform="";
    if(window.matchMedia("(max-width: 430px)").matches){
      const box=summary.getBoundingClientRect();
      menu.style.top=`${Math.min(box.bottom+6, window.innerHeight-menu.offsetHeight-12)}px`;
    }
  }
  function render(){ applyTheme(); document.body.classList.toggle("modalOpen",!!state.ui.modal); const views={today,plan:planView,session:sessionView,exercises:exercisesView,stats,settings}; $("#app").innerHTML=shell((views[state.ui.view]||today)()); bind(); }
  function on(id,fn){ const x=el(id); if(x) x.onclick=fn; }
  function bind(){
    $$("[data-view]").forEach(b=>b.onclick=()=>{state.ui.view=b.dataset.view; save().then(render);}); $$("[data-start]").forEach(b=>b.onclick=()=>start(b.dataset.start)); $$("[data-profile]").forEach(b=>b.onclick=()=>{state.activeProfileId=b.dataset.profile; save("Profil actif changé.").then(render);});
    on("createProfile",createProfile); on("startToday",()=>{const p=profile(), s=p?coachPickToday(p).session:null; if(s) start(s.id);}); on("goPlan",()=>{state.ui.view="plan"; save().then(render);}); on("nextWeek",()=>{const p=profile(); if(p){makeWeek(p.id,false,true); save("Semaine suivante générée.").then(render);}}); on("shortWeek",()=>{const p=profile(); if(p){makeWeek(p.id,true); save("Semaine minimale viable générée.").then(render);}}); on("regenShort",()=>{const p=profile(); if(p){makeWeek(p.id,true); save("Semaine minimale viable générée.").then(render);}}); on("regenNormal",()=>{const p=profile(); if(p){makeWeek(p.id,false); save("Semaine normale régénérée.").then(render);}}); on("activeRest",()=>{const p=profile(); if(p){state.activities.push({id:uid("activity"),profileId:p.id,source:"manual",type:"walk",startedAt:new Date().toISOString(),durationSeconds:1200}); save("Repos actif enregistré.").then(render);}});
    on("installPwa",installPwa); on("dismissPwa",()=>{state.settings.hideInstallPrompt=true; save().then(render);});
    $$("[data-rate-target]").forEach(b=>b.onclick=()=>{const input=el(b.dataset.rateTarget), val=Number(b.dataset.rateValue), m=mood[val]; if(!input||!m) return; input.value=val; const field=b.closest(".smileyField"), summary=field?.querySelector("summary"), details=field?.querySelector("details"); field?.classList.remove("empty","bad","warn","ok","good","great"); field?.classList.add(m.tone); field?.querySelectorAll("[data-rate-target]").forEach(x=>x.classList.toggle("selected",x===b)); if(summary) summary.innerHTML=`<b>${m.face}</b><small>${val}/5</small>`; if(details) details.open=false; if(["quickBack","quickKnee","quickFatigue"].includes(b.dataset.rateTarget)) saveQuickCheck(true); if(["profileBack","profileKnee","profileFatigue"].includes(b.dataset.rateTarget)) saveProfileFields(); updateAppBadge();});
    on("saveQuick",()=>saveQuickCheck(false)); on("regen",()=>{const p=profile(); if(p){makeWeek(p.id); save("Semaine normale générée.").then(render);}});
    on("startTimer",startTimer); on("continueAfterRest",continueAfterRest); on("skipRest",continueAfterRest); on("okSet",()=>log("yes",0,"ok")); on("partialSet",()=>log("partial",1,"hard")); on("painSet",()=>log("stop",3,"too_hard")); on("speakCue",()=>speakExerciseGuide(currentEx(),"Rappel.")); on("abortSession",()=>{const r=run(); if(r){r.abortedAt=new Date().toISOString(); state.ui.view="today"; stopTimer(); save("Séance arrêtée.").then(render);}});
    on("openMetricModal",()=>{state.ui.modal="metric"; render();}); on("openActivityModal",()=>{state.ui.modal="activity"; render();}); on("openNewProfile",()=>{state.ui.modal="newProfile"; render();}); on("openReadinessInfo",()=>{state.ui.modal="readiness"; render();}); on("openWeightChart",()=>{state.ui.modal="weightChart"; render();}); on("closeModal",()=>{state.ui.modal=null; render();});
    on("addMetric",addMetric); on("addRun",addRun); on("saveProfile",()=>saveProfileFields({regen:true,msg:"Profil et plan mis à jour."})); on("regenProfilePlan",()=>saveProfileFields({regen:true,msg:"Plan régénéré."}));
    $$("[data-save-video]").forEach(b=>b.onclick=()=>{state.exerciseVideos=state.exerciseVideos||{}; const id=b.dataset.saveVideo, v=text(`video_${id}`); if(v) state.exerciseVideos[id]=v; else delete state.exerciseVideos[id]; save("URL vidéo enregistrée.").then(render);});
    $$("[data-theme-choice]").forEach(b=>b.onclick=()=>{state.settings.theme=b.dataset.themeChoice; save().then(render);}); ["ttsEnabled","ttsRate","ttsVolume"].forEach(id=>{const x=el(id); if(x) x.onchange=saveTtsSettings;}); on("testVoice",()=>speak("ResurGo Fitness est prêt pour la séance.")); ["notifEnabled","notifTime"].forEach(id=>{const x=el(id); if(x) x.onchange=saveNotificationSettings;}); on("testNotification",async()=>{ if(notificationPermission()!=="granted"){ const ok=await requestSessionNotifications({test:true}); if(!ok) return; } else save((await showTodayNotification({force:true}))?"Notification envoyée.":"Aucune séance à notifier aujourd'hui.").then(render); }); ["workerUrl","workerToken"].forEach(id=>{const x=el(id); if(x) x.onchange=saveWorkerSettings;}); on("testWorker",testWorker); on("mockGarmin",mockGarmin);
    ["profileName","gender","age","heightCm","startWeightKg","targetWeightKg","targetMonths","availabilityDays","equipment","sportsHistory"].forEach(id=>{const x=el(id); if(x) x.onchange=()=>saveProfileFields();});
    Object.keys(levels).forEach(k=>{const x=el(`level_${k}`); if(x) x.onchange=()=>saveProfileFields();}); ["irradiating","neurological"].forEach(id=>{const x=el(id); if(x) x.onchange=()=>{const stateText=x.nextElementSibling?.querySelector(".switchState"); if(stateText) stateText.textContent=x.checked?"Oui":"Non"; saveProfileFields();};});
    $$(".smileyField details").forEach(details=>{ const summary=details.querySelector("summary"); if(summary) summary.onclick=e=>{ e.preventDefault(); const willOpen=!details.open; $$(".smileyField details[open]").forEach(x=>{ if(x!==details) x.open=false; }); details.open=willOpen; if(willOpen) requestAnimationFrame(()=>placeSmileyMenu(details)); }; });
    if(!smileyDismissBound){ document.addEventListener("pointerdown",e=>{ if(e.target.closest(".smileyField")) return; $$(".smileyField details[open]").forEach(x=>x.open=false); }); window.addEventListener("resize",()=>$$(".smileyField details[open]").forEach(placeSmileyMenu)); smileyDismissBound=true; }
    on("exportJson",()=>exportJson(false)); on("exportJsonSecrets",()=>exportJson(true)); on("deleteProfile",()=>{const p=profile(); if(p&&confirmTwice("Supprimer ce profil local ?","Confirmation définitive : supprimer ce profil et ses réglages ?")){state.profiles=state.profiles.filter(x=>x.id!==p.id); state.activeProfileId=state.profiles[0]?.id||null; save("Profil supprimé.").then(render);}}); on("resetAll",()=>{if(confirmTwice("Effacer toutes les données locales ResurGo Fitness ?","Confirmation définitive : tout effacer sur cet appareil ?")){state=clone(empty); save("Données locales effacées.").then(render);}});
    const imp=el("importJson"); if(imp) imp.onchange=e=>e.target.files[0]&&importJson(e.target.files[0]); const sf=el("exerciseSearchForm"); if(sf) sf.onsubmit=e=>{e.preventDefault(); state.ui.search=text("searchDraft"); state.ui.searchDraft=state.ui.search; save().then(render);}; const sd=el("searchDraft"); if(sd) sd.oninput=e=>{state.ui.searchDraft=e.target.value; if(!e.target.value){state.ui.search=""; save().then(render);}}; const f=el("familyFilter"); if(f) f.onchange=e=>{state.ui.filter=e.target.value; save().then(render);};
  }
  async function loadBodyMaps(){ await Promise.all(Object.keys(bodyMapAssets).map(async k=>{ try{ bodyMapSvg[k]=await fetch(bodyMapAssets[k],{cache:"force-cache"}).then(r=>r.ok?r.text():""); }catch{} })); }
  async function init(){ registerPwaEvents(); state=(await get("app"))||clone(empty); state={...clone(empty),...state,settings:{...empty.settings,...(state.settings||{}),notifications:{...empty.settings.notifications,...(state.settings?.notifications||{})},tts:{...empty.settings.tts,...(state.settings?.tts||{})}},ui:{...empty.ui,...(state.ui||{})}}; if(location.hash==="#today") state.ui.view="today"; state.ui.message=""; await loadBodyMaps(); render(); registerServiceWorker(); scheduleSessionReminder(); window.addEventListener("online",checkOnlineVersion); document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ updateAppBadge(); scheduleSessionReminder(); } }); }
  init();
})();
