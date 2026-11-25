  // Garmin Personal API: secrets never persisted by this browser.
  let garminBusy=false,garminAutoStarted=false,garminChecks={},garminStatusByProfile={};
  const garminPresent=v=>typeof v==="number"&&Number.isFinite(v);
  const garminMetricKeys=["distanceKm","durationSeconds","elevationGainM","hrAvg","hrMax","averagePowerW","maxPowerW","averageCadenceRpm","avgSpeedKmh","calories"];
  function garminActivityType(a){
    if(a.type==="cardio"&&a.sessionTitle){if(/vélo|bike/i.test(a.sessionTitle))return "bike";if(/course|run/i.test(a.sessionTitle))return "run";}
    return a.type;
  }
  function garminTime(a){return Date.parse(a.startedAt||"");}
  function garminMatch(local,remote){
    if(local.profileId!==remote.profileId||local.source==="garmin_personal"||local.garminActivityId&&local.garminActivityId!==remote.garminActivityId)return false;
    const lt=garminActivityType(local),rt=garminActivityType(remote);
    if(lt!==rt||!["bike","run","walk","strength","mobility","cardio"].includes(lt))return false;
    if(local.machineKind&&remote.machineKind&&local.machineKind!==remote.machineKind)return false;
    if(local.source==="resurgo_gps_phone"&&remote.machineKind)return false;
    const t=garminTime(local),u=garminTime(remote),d=local.durationSeconds,e=remote.durationSeconds;
    if(![t,u,d,e].every(garminPresent)||Math.min(d,e)<60||Math.abs(t-u)>300000)return false;
    const overlap=Math.min(t+d*1000,u+(remote.elapsedSeconds||e)*1000)-Math.max(t,u);
    return overlap>=Math.min(d,e)*700&&Math.abs(d-e)<=Math.max(180,Math.max(d,e)*.25);
  }
  function garminMergeActivity(local,remote){
    const source=local.source||"resurgo";
    const original={...(local.garminLocalMetrics||{})};
    if(!local.garminLocalMetrics){
      for(const k of garminMetricKeys)if(garminPresent(local[k]))original[k]=local[k];
      if(!garminPresent(original.hrAvg)&&garminPresent(local.averageHeartRate))original.hrAvg=local.averageHeartRate;
      if(!garminPresent(original.hrMax)&&garminPresent(local.maxHeartRate))original.hrMax=local.maxHeartRate;
    }
    const metrics={},chosen={};
    for(const k of garminMetricKeys){
      const a=original[k],b=remote[k];
      // Device recording normally wins over phone GPS or manual entry.
      // Direct PM5 measurement wins only if the distance is not estimated.
      const direct=["resurgo_pm5_ble","resurgo_ftms_ble"].includes(source);
      const indoorMetric=["distanceKm","averagePowerW","maxPowerW","averageCadenceRpm","avgSpeedKmh"].includes(k);
      const preferLocal=direct&&indoorMetric&&!(k==="distanceKm"&&(local.estimatedDistance!==false))&&
        !(k==="avgSpeedKmh"&&local.estimatedDistance!==false)&&!(k==="averagePowerW"||k==="averageCadenceRpm");
      if(garminPresent(a)&&(preferLocal||!garminPresent(b))){metrics[k]=a;chosen[k]=source;}
      else if(garminPresent(b)){metrics[k]=b;chosen[k]="garmin_personal";}
    }
    return {...local,...metrics,garminActivityId:remote.garminActivityId,garminLocalMetrics:original,metricSources:chosen,
      ...(garminPresent(metrics.hrAvg)?{averageHeartRate:metrics.hrAvg}:{}),...(garminPresent(metrics.hrMax)?{maxHeartRate:metrics.hrMax}:{})};
  }
  function garminReconcile(pid){
    let changed=false;
    const rows=state.activities.filter(x=>x.profileId===pid);
    const imported=rows.filter(x=>x.source==="garmin_personal"&&x.garminActivityId);
    for(const remote of imported){
      const candidates=rows.filter(a=>a.source!=="garmin_personal"&&(a.garminActivityId===remote.garminActivityId||garminMatch(a,remote)));
      const explicit=candidates.filter(a=>a.garminActivityId===remote.garminActivityId);
      const local=explicit.length===1?explicit[0]:explicit.length===0&&candidates.length===1?candidates[0]:null;
      if(local){
        // Avoid combining a local session with two similarly timed Garmin records.
        const other=imported.filter(r=>r!==remote&&garminMatch(local,r));
        if(!explicit.length&&other.length)continue;
        const merged=garminMergeActivity(local,remote);
        if(JSON.stringify(merged)!==JSON.stringify(local)){Object.assign(local,merged);changed=true;}
        if(remote.mergedInto!==local.id){remote.mergedInto=local.id;changed=true;}
      }else if(remote.mergedInto&&!rows.some(x=>x.id===remote.mergedInto)){delete remote.mergedInto;changed=true;}
    }
    return changed;
  }
  function garminVisibleActivities(pid){
    const all=state.activities.filter(a=>a.profileId===pid);
    return all.filter(a=>!a.mergedInto||!all.some(x=>x.id===a.mergedInto));
  }
  function garminUpsertActivities(pid,rows){
    let changed=false;
    for(const raw of rows||[]){
      if(!raw?.garminActivityId||!raw.startedAt)continue;
      const id="garmin_"+pid+"_"+raw.garminActivityId,prev=state.activities.find(x=>x.id===id);
      const item={...prev,...raw,id,profileId:pid,source:"garmin_personal"};
      if(!prev){state.activities.push(item);changed=true;}
      else if(JSON.stringify(prev)!==JSON.stringify(item)){Object.assign(prev,item);changed=true;}
    }
    return garminReconcile(pid)||changed;
  }
  function garminUpsertHealth(pid,dataset,rows){
    let changed=false;
    for(const raw of rows||[]){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(raw?.date||""))continue;
      const id="garmin_"+pid+"_"+dataset+"_"+raw.date,prev=state.metrics.find(x=>x.id===id);
      const item={...prev,...raw,id,profileId:pid,source:"garmin_personal",measuredAt:raw.date+"T12:00:00",garminDataset:dataset};
      if(!prev){state.metrics.push(item);changed=true;}
      else if(JSON.stringify(prev)!==JSON.stringify(item)){Object.assign(prev,item);changed=true;}
    }
    return changed;
  }
  function garminRecovery(pid){
    const day=new Date();const yesterday=new Date(day);yesterday.setDate(day.getDate()-1);
    const floor=garminDate(yesterday);
    const recent=state.metrics.filter(m=>m.profileId===pid&&m.source==="garmin_personal"&&String(m.date)>=floor);
    const sleep=recent.filter(x=>garminPresent(x.sleepSeconds)).sort((a,b)=>String(b.date).localeCompare(a.date))[0];
    const hrv=recent.filter(x=>x.hrvStatus).sort((a,b)=>String(b.date).localeCompare(a.date))[0];
    const load=garminVisibleActivities(pid).filter(a=>Date.now()-garminTime(a)>=0&&Date.now()-garminTime(a)<86400000&&a.durationSeconds>=3600&&["run","bike","cardio","strength"].includes(a.type));
    const reasons=[];
    if(sleep&&sleep.sleepSeconds<6*3600)reasons.push("sommeil court");
    if(hrv&&/^(LOW|UNBALANCED|POOR)$/i.test(hrv.hrvStatus))reasons.push("VFC Garmin défavorable");
    if(load.length)reasons.push("séance longue dans les dernières 24 h");
    return {light:reasons.length>0,reasons};
  }
  function garminPanel(){
    const p=profile();if(!p)return "<p>Créer un profil avant de connecter Garmin.</p>";
    const status=garminStatusByProfile[p.id];
    const recovery=garminRecovery(p.id);
    return '<p><strong>'+esc(p.name)+'</strong> · clé personnelle propre à ce profil. Stockée chiffrée sur le NAS, jamais dans la PWA.</p>'+
      '<p><a target="_blank" rel="noopener noreferrer" href="https://connect.garmin.com/app/settings/personalApiToken">Créer / renouveler ma clé Garmin</a></p>'+
      '<label>Clé API Garmin<input id="garminKey" type="password" autocomplete="off" spellcheck="false" placeholder="Coller la clé personnelle"></label>'+
      '<div class="actions"><button class="primary" id="garminConfigure">Connecter Garmin</button><button class="secondary" id="garminCheck">Vérifier</button><button class="secondary" id="garminDisconnect">Déconnecter</button></div>'+
      '<label>Historique à importer<select id="garminDays"><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">1 an</option><option value="1825">5 ans (par lots)</option></select></label>'+
      '<div class="actions"><button class="primary" id="garminSync">Synchroniser maintenant</button></div>'+
      '<p class="muted">Synchronisation automatique du profil actif au premier plan, environ toutes les heures. Lecture seule. Les données absentes ne sont pas inventées.</p>'+
      '<p id="garminStatus" role="status">'+esc(status||"Vérifier la connexion NAS puis Garmin.")+'</p>'+
      '<p>'+esc(recovery.light?"Coach : récupération prudente ("+recovery.reasons.join(", ")+").":"Coach : aucun signal Garmin de récupération défavorable identifié.")+'</p>';
  }
  function garminSetStatus(pid,msg){
    garminStatusByProfile[pid]=msg;
    const field=el("garminStatus");if(field&&profile()?.id===pid)field.textContent=msg;
  }
  async function garminConn(pid){
    const conn=await nasStoredConnection();
    if(!conn?.token||!conn.url)throw Error("Associer cet appareil au NAS ResurGo.");
    if(new URL(conn.url).protocol!=="https:")throw Error("HTTPS nécessaire.");
    const meta=await nasSyncLoadMeta(conn);
    if(!meta.remoteProfileIds?.includes(pid)){
      await nasSyncNow();
      const fresh=await nasSyncLoadMeta(conn);
      if(!fresh.remoteProfileIds?.includes(pid))throw Error("Synchroniser le profil avec le NAS avant Garmin.");
    }
    return conn;
  }
  function garminPath(pid,part){return "/api/v1/garmin/"+encodeURIComponent(pid)+"/"+part;}
  async function garminCheck(){
    const pid=profile()?.id;if(!pid)return;
    try{const c=await garminConn(pid),r=await nasRequest(c.url,garminPath(pid,"status"),{token:c.token});
      garminSetStatus(pid,r.configured?"Garmin configuré sur le NAS.":"Garmin non connecté.");
      return r.configured;
    }catch(e){garminSetStatus(pid,"Garmin : "+e.message);return false;}
  }
  async function garminConfigure(){
    const pid=profile()?.id,field=el("garminKey"),apiKey=field?.value?.trim();if(!pid||!apiKey)return;
    if(field)field.value="";
    try{const c=await garminConn(pid);
      await nasRequest(c.url,garminPath(pid,"configure"),{method:"POST",token:c.token,payload:{apiKey}});
      garminSetStatus(pid,"Clé validée et enregistrée sur le NAS.");
      await garminSyncProfile(pid,30,true);
    }catch(e){garminSetStatus(pid,"Connexion Garmin impossible : "+e.message);}
  }
  async function garminDisconnect(){
    const pid=profile()?.id;if(!pid||!confirm("Retirer la clé Garmin de ce profil ? Les données déjà importées restent dans ResurGo."))return;
    try{const c=await garminConn(pid);await nasRequest(c.url,garminPath(pid,"disconnect"),{method:"POST",token:c.token,payload:{}});garminSetStatus(pid,"Garmin déconnecté.");}
    catch(e){garminSetStatus(pid,e.message);}
  }
  function garminDate(d){const z=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate());}
  async function garminSyncProfile(pid,days=7,manual=false){
    if(garminBusy||state.liveSession||run()||document.hidden)return;
    if(!state.profiles.some(p=>p.id===pid))return;
    garminBusy=true;
    let changed=false,activities=0,errors=[],complete=false;
    try{
      const c=await garminConn(pid);
      const cfg=await nasRequest(c.url,garminPath(pid,"status"),{token:c.token});
      if(!cfg.configured){if(manual)garminSetStatus(pid,"Connecter Garmin d’abord.");return;}
      garminSetStatus(pid,"Import Garmin en cours…");
      // Pull NAS first to reconcile against sessions created on other devices.
      await nasSyncNow();
      const end=new Date(),first=new Date(end);first.setDate(first.getDate()-Math.max(1,Math.min(days,1825))+1);
      let cursor=new Date(first),pages=0;
      while(cursor<=end){
        const stop=new Date(cursor);stop.setDate(stop.getDate()+364);if(stop>end)stop.setTime(end.getTime());
        let offset=0;
        while(true){
          if(++pages>300)throw Error("Limite de pagination atteinte ; relancer par période plus courte.");
          const q="?startDate="+garminDate(cursor)+"&endDate="+garminDate(stop)+"&offset="+offset;
          const r=await nasRequest(c.url,garminPath(pid,"activities")+q,{token:c.token});
          changed=garminUpsertActivities(pid,r.activities)||changed;activities+=(r.activities||[]).length;
          if(!r.hasMore)break;if(!(r.nextOffset>offset))throw Error("Pagination Garmin incohérente.");
          offset=r.nextOffset;
          if(pages%4===0)await put("app",state);
        }
        cursor=new Date(stop);cursor.setDate(cursor.getDate()+1);
      }
      // Health history limited to 30 days to minimize data and requests.
      const hs=new Date(end);hs.setDate(hs.getDate()-Math.min(29,days-1));
      for(const dataset of ["sleep","daily","hrv","weight"]){
        try{
          const q="?dataset="+dataset+"&startDate="+garminDate(hs)+"&endDate="+garminDate(end);
          const r=await nasRequest(c.url,garminPath(pid,"health")+q,{token:c.token});
          changed=garminUpsertHealth(pid,dataset,r.measurements)||changed;
        }catch(e){errors.push(dataset);}
      }
      complete=true;
    }catch(e){errors.push(e.message);}
    finally{
      if(changed){
        if(!run()&&!state.liveSession&&state.profiles.some(p=>p.id===pid))refreshPlanAfterActivity(pid);
        await save();nasSyncSchedule();
      }
      garminChecks[pid]=Date.now();
      if(complete||errors.length)garminSetStatus(pid,(complete?"Garmin : "+activities+" activité(s) examinée(s).":"Import partiel.")+(errors.length?" À vérifier : "+errors.join(", "):" Synchronisation terminée."));
      garminBusy=false;
    }
  }
  function garminAutoStart(){
    if(garminAutoStarted)return;garminAutoStarted=true;
    const check=()=>{const pid=profile()?.id;if(pid&&!document.hidden&&navigator.onLine&&Date.now()-(garminChecks[pid]||0)>3600000)garminSyncProfile(pid,7,false).catch(()=>{});};
    setInterval(check,60000);setTimeout(check,5000);
    window.addEventListener("online",check);document.addEventListener("visibilitychange",check);
  }
  function personalStrength(){
    const p=profile();if(!p||run()||state.liveSession)return;
    const ids=protectionMode(p)?["warmup_flow","dead_bug","bird_dog","cooldown_breathing"]:["warmup_flow","incline_pushup","band_row","sit_to_stand","glute_bridge","cooldown_breathing"];
    const session={id:uid("personal"),profileId:p.id,title:"Musculation personnelle · poids du corps / élastique",type:"strength",minutes:30,exerciseIds:ids,weekStart:activeWeekKeyForProfile(p.id),date:TODAY,personal:true,completedAt:null};
    state.plans.push(session);start(session.id);
  }
  function sessionLauncher(){
    if(!profile())return needProfile();
    const p=profile(),pick=coachPickToday(p);
    return '<section class="grid"><h1>Séance</h1><article class="panel"><h2>Séance du jour</h2><p>'+esc(pick.session?.title||pick.title)+'</p><p class="muted">'+esc(pick.reason)+'</p>'+(pick.session?'<button class="primary" id="startToday">Lancer la séance du jour</button>':'')+'</article>'+
      '<article class="panel"><h2>Séance personnelle</h2><p>Choisis ton activité, indépendamment du programme du jour.</p><div class="grid two">'+
      '<button class="primary" id="personalStrength">Musculation guidée</button><button class="secondary" data-personal-live="run">Course extérieure · GPS</button>'+
      '<button class="secondary" data-personal-live="treadmill">Course intérieure · tapis BLE</button><button class="secondary" data-personal-live="bike">Vélo extérieur · GPS</button>'+
      '<button class="secondary" data-personal-live="indoorbike">Vélo intérieur · PM5 / FTMS</button><button class="secondary" data-personal-live="elliptical">Elliptique · FTMS</button></div></article></section>';
  }
  function openPersonalLive(kind){
    if(run()||state.liveSession)return;
    state.ui.personalPlannedId=null;state.ui.personalLiveKind=kind;state.ui.view="coachLive";save().then(render);
  }

  function launchPlannedSession(s){
    if(run()||state.liveSession)return;
    const kind=(s.exerciseIds||[]).includes("easy_bike")?"bike":
      (s.exerciseIds||[]).some(id=>["easy_run","run_walk"].includes(id))?"run":null;
    if(s.type!=="cardio"||!kind){start(s.id);return;}
    state.ui.personalPlannedId=s.id;state.ui.personalLiveKind=kind==="bike"?"plannedbike":"plannedrun";
    state.ui.view="coachLive";save().then(render);
  }
  function garminPlannedLiveId(sport){
    const id=state.ui.personalPlannedId,planned=state.plans.find(p=>p.id===id&&p.profileId===profile()?.id&&!p.completedAt);
    if(!planned)return null;
    const kind=(planned.exerciseIds||[]).includes("easy_bike")?"bike":"run";
    return kind===sport?id:null;
  }
