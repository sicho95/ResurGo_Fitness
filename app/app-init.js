  // Brancher ici tous les événements DOM.
  // Ce module reste le point d'entrée final du bundle applicatif.
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
    swRegistration=await navigator.serviceWorker.register(`./sw.js?build=${encodeURIComponent(APP_BUILD)}`,{updateViaCache:"none"}).catch(()=>null);
    if(!swRegistration) return;
    if(swRegistration.waiting){ updateWaiting=swRegistration.waiting; applyHotUpdate(); }
    swRegistration.addEventListener("updatefound",()=>{ const nw=swRegistration.installing; if(!nw) return; nw.addEventListener("statechange",()=>{ if(nw.state==="installed"&&navigator.serviceWorker.controller){ updateWaiting=nw; applyHotUpdate(); } }); });
    await checkOnlineVersion();
    scheduleSessionReminder();
  }
  function saveQuickCheck(silent=true){ const p=profile(); if(!p) return; p.health.backPain=loadScore("quickBack"); p.health.kneePain=loadScore("quickKnee"); p.health.tendonPain=loadScore("quickKnee"); p.health.fatigue=loadScore("quickFatigue"); save(silent?"":"Check rapide enregistré."); }
  function saveProfileFields({regen=false,msg=""}={}){
    const p=profile(); if(!p) return;
    p.name=text("profileName")||p.name; p.gender=el("gender")?.value||p.gender||"male"; p.mediaGender=el("mediaGender")?.value||p.mediaGender||p.gender||"male"; p.age=num("age")??p.age; p.heightCm=num("heightCm")??p.heightCm; p.startWeightKg=num("startWeightKg")??p.startWeightKg; p.targetWeightKg=num("targetWeightKg")??p.targetWeightKg; p.targetMonths=num("targetMonths")??p.targetMonths??6; p.availabilityDays=Number(el("availabilityDays")?.value)===7?7:5; p.sportsHistory=text("sportsHistory");
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
  function saveExerciseSettings(id){
    state.exerciseVideos=state.exerciseVideos||{};
    state.exerciseMetaOverrides=state.exerciseMetaOverrides||{};
    const video=text(`video_${id}`), base=ex.find(x=>x.id===id), role=el(`role_${id}`)?.value||base?.training?.role||"strength", load=el(`load_${id}`)?.value||base?.training?.load||"moderate";
    if(video) state.exerciseVideos[id]=video; else delete state.exerciseVideos[id];
    if(base&&(role!==base.training.role||load!==base.training.load)) state.exerciseMetaOverrides[id]={...state.exerciseMetaOverrides[id],role,load};
    else delete state.exerciseMetaOverrides[id];
    save("Exercice mis à jour.").then(render);
  }
  async function saveNotificationSettings(){
    state.settings.notifications.enabled=!!el("notifEnabled")?.checked;
    state.settings.notifications.reminderTime=el("notifTime")?.value||"08:00";
    const stateText=el("notifEnabled")?.nextElementSibling?.querySelector(".switchState");
    if(stateText) stateText.textContent=state.settings.notifications.enabled?"Oui":"Non";
    if(state.settings.notifications.enabled&&notificationPermission()!=="granted"){
      await requestSessionNotifications({test:false,rerender:false});
      const refreshedText=el("notifEnabled")?.nextElementSibling?.querySelector(".switchState");
      if(refreshedText) refreshedText.textContent=state.settings.notifications.enabled?"Oui":"Non";
    }else{
      await save();
    }
    const status=el("notificationStatus");
    if(status) status.textContent=notificationStatusText();
    scheduleSessionReminder();
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
  function setSegmentedActive(btn){
    btn.parentElement?.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===btn));
  }
  function setChartViewport(key,total,next){
    state.ui.chartViewport=state.ui.chartViewport||{};
    const current=chartViewport(key,total), size=Math.max(2,Math.min(total,Math.round(next.size??current.size))), maxOffset=Math.max(0,total-size), offset=Math.max(0,Math.min(maxOffset,Math.round(next.offset??current.offset)));
    state.ui.chartViewport[key]={window:size,offset};
    render();
  }
  function setChartHover(svg, clientX){
    const rect=svg.getBoundingClientRect(), view=svg.viewBox.baseVal, visible=[...svg.querySelectorAll(".chartPoint")], count=visible.reduce((m,p)=>Math.max(m,Number(p.dataset.pointIndex)||0),0)+1;
    if(!rect.width||!count) return;
    const localX=(clientX-rect.left)/rect.width*view.width, idx=Math.max(0,Math.min(count-1,Math.round((localX-30)/Math.max(1,(view.width-60)/Math.max(1,count-1)))));
    visible.forEach(p=>p.classList.toggle("active",Number(p.dataset.pointIndex)===idx));
    const active=svg.querySelector(`.chartPoint[data-point-index="${idx}"] title`), readout=svg.querySelector(".chartReadout");
    if(readout&&active) readout.textContent=active.textContent||"";
  }
  function bindInteractiveCharts(){
    $$('svg[data-interactive-chart="1"]').forEach(svg=>{
      const key=svg.dataset.chartKey, total=Number(svg.dataset.chartTotal)||0; if(!key||total<2) return;
      let startX=null, startOffset=0, pinchStart=null, pinchSize=0;
      svg.onpointermove=e=>setChartHover(svg,e.clientX);
      svg.onpointerdown=e=>{ startX=e.clientX; startOffset=chartViewport(key,total).offset; svg.setPointerCapture?.(e.pointerId); };
      svg.onpointerup=e=>{ if(startX==null) return; const dx=e.clientX-startX, current=chartViewport(key,total), step=Math.round(-dx/Math.max(1,svg.getBoundingClientRect().width)*current.size); startX=null; if(step) setChartViewport(key,total,{size:current.size,offset:startOffset+step}); };
      svg.onwheel=e=>{ e.preventDefault(); const current=chartViewport(key,total), direction=e.deltaY>0?1:-1, nextSize=current.size+direction*Math.max(1,Math.round(current.size*.18)), center=current.offset+current.size/2; setChartViewport(key,total,{size:nextSize,offset:center-nextSize/2}); };
      svg.ontouchstart=e=>{ if(e.touches.length===2){ const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY; pinchStart=Math.hypot(dx,dy); pinchSize=chartViewport(key,total).size; } };
      svg.ontouchmove=e=>{ if(e.touches.length===1) setChartHover(svg,e.touches[0].clientX); if(e.touches.length===2&&pinchStart){ e.preventDefault(); const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY, ratio=Math.max(.35,Math.min(3,Math.hypot(dx,dy)/pinchStart)), current=chartViewport(key,total), nextSize=Math.round(pinchSize/ratio), center=current.offset+current.size/2; setChartViewport(key,total,{size:nextSize,offset:center-nextSize/2}); } };
    });
  }
  function bind(){
    $$("[data-view]").forEach(b=>b.onclick=()=>{state.ui.view=b.dataset.view; save().then(render);}); $$("[data-start]").forEach(b=>b.onclick=()=>start(b.dataset.start)); $$("[data-profile]").forEach(b=>b.onclick=()=>{state.activeProfileId=b.dataset.profile; save("Profil actif changé.").then(render);});
    on("createProfile",createProfile); on("startToday",()=>{const p=profile(), s=p?coachPickToday(p).session:null; if(s) start(s.id);}); on("goPlan",()=>{state.ui.view="plan"; save().then(render);}); on("nextWeek",()=>{const p=profile(); if(p){makeWeek(p.id,false,true); save("Semaine suivante générée.").then(render);}}); on("regenPlan",()=>{const p=profile(); if(p){makeWeek(p.id); save("Plan recalculé.").then(render);}}); on("activeRest",()=>{const p=profile(); if(p){state.activities.push({id:uid("activity"),profileId:p.id,source:"manual",type:"walk",startedAt:new Date().toISOString(),durationSeconds:1200}); refreshPlanAfterActivity(p.id); save("Repos actif enregistré et plan recalculé.").then(render);}});
    on("installPwa",installPwa); on("dismissPwa",()=>{state.settings.hideInstallPrompt=true; save().then(render);});
    $$("[data-rate-target]").forEach(b=>b.onclick=()=>{const input=el(b.dataset.rateTarget), val=Number(b.dataset.rateValue), m=mood[val]; if(!input||!m) return; input.value=val; const field=b.closest(".smileyField"), summary=field?.querySelector("summary"), details=field?.querySelector("details"); field?.classList.remove("empty","bad","warn","ok","good","great"); field?.classList.add(m.tone); field?.querySelectorAll("[data-rate-target]").forEach(x=>x.classList.toggle("selected",x===b)); if(summary) summary.innerHTML=`<b>${m.face}</b><small>${val}/5</small>`; if(details) details.open=false; if(["quickBack","quickKnee","quickFatigue"].includes(b.dataset.rateTarget)) saveQuickCheck(true); if(["profileBack","profileKnee","profileFatigue"].includes(b.dataset.rateTarget)) saveProfileFields(); updateAppBadge();});
    $$("[data-week-window-target]").forEach(b=>b.onclick=()=>{const input=el(b.dataset.weekWindowTarget); if(!input) return; input.value=Number(b.dataset.weekWindowValue)===7?"7":"5"; setSegmentedActive(b); if(input.id==="availabilityDays") saveProfileFields({regen:true,msg:`Plan recalculé sur ${input.value} jours.`});});
    $$("[data-media-target]").forEach(b=>b.onclick=()=>{const input=el(b.dataset.mediaTarget); if(!input) return; input.value=b.dataset.mediaValue==="female"?"female":"male"; setSegmentedActive(b); if(input.id==="mediaGender") saveProfileFields({regen:false,msg:"Médias mis à jour."});});
    on("saveQuick",()=>saveQuickCheck(false)); on("regen",()=>{const p=profile(); if(p){makeWeek(p.id); save("Plan régénéré.").then(render);}});
    on("startTimer",startTimer); on("continueAfterRest",continueAfterRest); on("skipRest",continueAfterRest); on("okSet",()=>log("yes",0,"ok")); on("partialSet",()=>log("partial",1,"hard")); on("painSet",()=>log("stop",3,"too_hard")); on("speakCue",()=>speakExerciseGuide(currentEx(),"Rappel.")); on("abortSession",()=>{const r=run(); if(r){r.abortedAt=new Date().toISOString(); state.ui.view="today"; stopTimer(); save("Séance arrêtée.").then(render);}});
    on("openMetricModal",()=>{state.ui.modal="metric"; render();}); on("openActivityModal",()=>{state.ui.modal="activity"; render();}); on("openNewProfile",()=>{state.ui.modal="newProfile"; render();}); on("openReadinessInfo",()=>{state.ui.modal="readiness"; render();}); on("openWeightChart",()=>{state.ui.modal="weightChart"; render();}); on("closeModal",()=>{state.ui.modal=null; state.ui.recordEdit=null; render();});
    $$("[data-open-chart]").forEach(b=>b.onclick=()=>{ const key=b.dataset.openChart; state.ui.modal=`chart_${key}`; state.ui.recordEdit=null; state.ui.chartViewport=state.ui.chartViewport||{}; state.ui.chartHistoryOpen={...(state.ui.chartHistoryOpen||{}),[key]:false}; render(); });
    bindInteractiveCharts();
    $$(".chartHistoryFold").forEach(d=>d.ontoggle=()=>{ const key=String(state.ui.modal||"").replace("chart_",""); if(!key) return; state.ui.chartHistoryOpen=state.ui.chartHistoryOpen||{}; state.ui.chartHistoryOpen[key]=d.open; });
    $$("[data-edit-metric]").forEach(b=>b.onclick=()=>beginRecordEdit("metric",b.dataset.editMetric));
    $$("[data-save-metric]").forEach(b=>b.onclick=()=>saveMetricRecord(b.dataset.saveMetric));
    $$("[data-delete-metric]").forEach(b=>b.onclick=()=>deleteMetricRecord(b.dataset.deleteMetric));
    $$("[data-edit-activity]").forEach(b=>b.onclick=()=>beginRecordEdit("activity",b.dataset.editActivity));
    $$("[data-save-activity]").forEach(b=>b.onclick=()=>saveActivityRecord(b.dataset.saveActivity));
    $$("[data-delete-activity]").forEach(b=>b.onclick=()=>deleteActivityRecord(b.dataset.deleteActivity));
    $$("[data-cancel-record-edit]").forEach(b=>b.onclick=()=>cancelRecordEdit());
    on("addMetric",addMetric); on("addRun",addRun); on("saveProfile",()=>saveProfileFields({regen:true,msg:"Profil et plan mis à jour."})); on("regenProfilePlan",()=>saveProfileFields({regen:true,msg:"Plan régénéré."}));
    $$("[data-save-exercise]").forEach(b=>b.onclick=()=>saveExerciseSettings(b.dataset.saveExercise));
    $$("[data-theme-choice]").forEach(b=>b.onclick=()=>{state.settings.theme=b.dataset.themeChoice; save().then(render);}); ["ttsEnabled","ttsRate","ttsVolume"].forEach(id=>{const x=el(id); if(x) x.onchange=saveTtsSettings;}); on("testVoice",()=>speak("ResurGo Fitness est prêt pour la séance.")); ["notifEnabled","notifTime"].forEach(id=>{const x=el(id); if(x) x.onchange=saveNotificationSettings;}); on("testNotification",async()=>{ if(notificationPermission()!=="granted"){ const ok=await requestSessionNotifications({test:true}); if(!ok) return; } else save((await showTodayNotification({force:true}))?"Notification envoyée.":"Aucune séance à notifier aujourd'hui.").then(render); }); ["workerUrl","workerToken"].forEach(id=>{const x=el(id); if(x) x.onchange=saveWorkerSettings;}); on("testWorker",testWorker); on("mockGarmin",mockGarmin);
    { const x=el("newGender"), media=el("newMediaGender"); if(x&&media) x.onchange=()=>{ media.value=x.value==="female"?"female":"male"; }; }
    ["profileName","gender","mediaGender","availabilityDays","age","heightCm","startWeightKg","targetWeightKg","targetMonths","sportsHistory"].forEach(id=>{const x=el(id); if(x) x.onchange=()=>saveProfileFields();});
    Object.keys(levels).forEach(k=>{const x=el(`level_${k}`); if(x) x.onchange=()=>saveProfileFields();}); ["irradiating","neurological"].forEach(id=>{const x=el(id); if(x) x.onchange=()=>{const stateText=x.nextElementSibling?.querySelector(".switchState"); if(stateText) stateText.textContent=x.checked?"Oui":"Non"; saveProfileFields();};});
    $$(".smileyField details").forEach(details=>{ const summary=details.querySelector("summary"); if(summary) summary.onclick=e=>{ e.preventDefault(); const willOpen=!details.open; $$(".smileyField details[open]").forEach(x=>{ if(x!==details) x.open=false; }); details.open=willOpen; if(willOpen) requestAnimationFrame(()=>placeSmileyMenu(details)); }; });
    if(!smileyDismissBound){ document.addEventListener("pointerdown",e=>{ if(e.target.closest(".smileyField")) return; $$(".smileyField details[open]").forEach(x=>x.open=false); }); window.addEventListener("resize",()=>$$(".smileyField details[open]").forEach(placeSmileyMenu)); smileyDismissBound=true; }
    on("exportJson",()=>exportJson(false)); on("exportJsonSecrets",()=>exportJson(true)); on("deleteProfile",()=>{const p=profile(); if(p&&confirmTwice("Supprimer ce profil local ?","Confirmation définitive : supprimer ce profil et ses réglages ?")){state.profiles=state.profiles.filter(x=>x.id!==p.id); state.activeProfileId=state.profiles[0]?.id||null; save("Profil supprimé.").then(render);}}); on("resetAll",()=>{if(confirmTwice("Effacer toutes les données locales ResurGo Fitness ?","Confirmation définitive : tout effacer sur cet appareil ?")){state=clone(empty); save("Données locales effacées.").then(render);}});
    const imp=el("importJson"); if(imp) imp.onchange=e=>e.target.files[0]&&importJson(e.target.files[0]); const sf=el("exerciseSearchForm"); if(sf) sf.onsubmit=e=>{e.preventDefault(); state.ui.search=text("searchDraft"); state.ui.searchDraft=state.ui.search; save().then(render);}; const sd=el("searchDraft"); if(sd) sd.oninput=e=>{state.ui.searchDraft=e.target.value; if(!e.target.value){state.ui.search=""; save().then(render);}}; const f=el("familyFilter"); if(f) f.onchange=e=>{state.ui.filter=e.target.value; save().then(render);};
  }
  async function loadBodyMaps(){ await Promise.all(Object.keys(bodyMapAssets).map(async k=>{ try{ bodyMapSvg[k]=await fetch(bodyMapAssets[k],{cache:"force-cache"}).then(r=>r.ok?r.text():""); }catch{} })); }
  async function init(){ registerPwaEvents(); state=(await get("app"))||clone(empty); state={...clone(empty),...state,settings:{...empty.settings,...(state.settings||{}),notifications:{...empty.settings.notifications,...(state.settings?.notifications||{})},tts:{...empty.settings.tts,...(state.settings?.tts||{})}},ui:{...empty.ui,...(state.ui||{})}}; if(location.hash==="#today") state.ui.view="today"; state.ui.message=""; if(state.activeProfileId) ensurePlanCurrent(state.activeProfileId); await loadBodyMaps(); render(); registerServiceWorker(); scheduleSessionReminder(); window.addEventListener("online",checkOnlineVersion); document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ if(state.activeProfileId&&ensurePlanCurrent(state.activeProfileId)) save("Plan réajusté selon les jours passés.").then(render); updateAppBadge(); scheduleSessionReminder(); } }); }
  init();
})();
