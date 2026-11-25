  // Live coaching outdoor only. Browser GPS cannot guarantee lockscreen continuity on iOS.
  let liveGpsWatch=null,liveInterval=null,liveWake=null;
  const liveMessages={
    start:[1,"C'est parti. Prends le temps de trouver ton rythme."],
    climb:[18,"Regarde quelques mètres devant toi. Une foulée après l'autre."],
    summit:[25,"La montée est passée. Prends quelques instants pour souffler."],
    downhill:[28,"La descente t'aide déjà à avancer. N'en rajoute pas."],
    positive:[57,"Tu prends du temps pour toi, et c'est précieux."],
    finish:[65,"Bravo, tu as terminé ta séance. Savoure cet instant !"],
    warmup:[5,"Prends tes repères, inutile de partir trop vite."],
    steady:[21,"Garde un rythme qui te permet de maîtriser ton souffle."],
    active:[51,"Reste concentré sur ton effort, pas seulement sur le chrono."],
    easy:[31,"Relâche les épaules, retrouve progressivement tes sensations."],
    cool:[75,"Aujourd’hui, la récupération fait partie de ton entraînement."],
    halfway:[53,"Tu es à mi-parcours, continue de suivre tes sensations."],
    slower:[35,"Tu peux ralentir, l’important est de bien gérer ton effort."],
    stop:[70,"Aujourd'hui était plus difficile. Merci d'avoir écouté tes sensations."]
  };
  const liveVaried=[9,10,12,15,21,31,34,38,40,51,58,59,61,62,63,64,57];
  const liveVariedText=["C'est bien, le rythme est régulier.","Tu gères ton effort, continue comme ça.","La régularité d'aujourd'hui construit les progrès de demain.","Reste détendu, c'est une belle séance de travail.","Garde un rythme qui te permet de maîtriser ton souffle.","Relâche les épaules, retrouve progressivement tes sensations.","Concentre-toi sur le prochain petit objectif, pas sur toute la distance.","Tu as le droit d'adapter ta séance, c'est aussi bien s'entraîner.","Garde le mouvement le plus confortable possible.","Reste concentré sur ton effort, pas seulement sur le chrono.","Aujourd'hui, tu construis quelque chose pour la suite.","Il n'y a pas de petit effort quand on avance avec régularité.","Très bien, profite simplement de ce moment.","Tu peux être fier de la constance que tu construis.","Chaque séance a sa place dans ton parcours.","Ce n'est pas une compétition contre les autres.","Tu prends du temps pour toi, et c'est précieux."];
  function liveEncourage(s=state.liveSession){
    if(!s)return;const n=(s.encouragementIndex||0)%liveVaried.length;s.encouragementIndex=n+1;s.lastSpeech=Date.now();liveSpeech("positive",[liveVaried[n],liveVariedText[n]]);
  }
  function liveFreeCue(s){
    const t=liveSeconds(s),d=s.distanceM||0;
    if(s.nextCueSeconds==null)s.nextCueSeconds=(Math.floor(t/600)+1)*600;
    if(s.nextCueDistance==null)s.nextCueDistance=(Math.floor(d/5000)+1)*5000;
    if(t<s.nextCueSeconds&&d<s.nextCueDistance)return false;
    if(Date.now()-(s.lastSpeech||0)<30000)return false;
    s.nextCueSeconds=(Math.floor(t/600)+1)*600;s.nextCueDistance=(Math.floor(d/5000)+1)*5000;liveEncourage(s);return true;
  }
  function liveSpeech(key,override=null){
    if(state.settings?.tts?.enabled===false)return;
    const [n,phrase]=override||liveMessages[key]||liveMessages.positive;
    voiceSpeakId("phrase_"+String(n).padStart(3,"0"))
      .then(played=>{if(!played)speak(phrase);}).catch(()=>speak(phrase));
  }
  function liveDistance(a,b){
    const r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lon-a.lon)*r;
    const h=Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2;
    return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function liveSeconds(s){
    return Math.max(0,Math.round((Date.now()-Date.parse(s.startedAt)-s.pausedMs-
      (s.pausedAt?Date.now()-Date.parse(s.pausedAt):0))/1000));
  }
  const liveClock=n=>[Math.floor(n/3600),Math.floor(n/60)%60,n%60]
    .map(x=>String(x).padStart(2,"0")).join(":");
  const livePace=v=>v>.25?((()=>{
    const sec=1000/v;return Math.floor(sec/60)+":"+
      String(Math.round(sec%60)).padStart(2,"0")+"/km";
  })()):"—";
  const liveKinds={indoorbike:"bike",plannedbike:"bike",treadmill:"treadmill",plannedrun:"treadmill",elliptical:"elliptical"};
  function liveSelectedMachine(){return state.liveSession?.machineKind||liveKinds[state.ui.personalLiveKind]||null;}
  function liveTile(label,id,value="—"){return '<div class="liveMetric"><span>'+label+'</span><strong id="'+id+'">'+esc(value)+'</strong></div>';}
  function liveCoachView(){
    const s=state.liveSession,k=state.ui.personalLiveKind,expected=liveSelectedMachine();
    if(!s){
      const indoor=!!expected||!k, outRun=!k||["run","plannedrun"].includes(k),outBike=!k||["bike","plannedbike"].includes(k);
      const title=({run:"Course extérieure",bike:"Vélo extérieur",indoorbike:"Vélo intérieur",treadmill:"Course intérieure",elliptical:"Elliptique",plannedbike:"Séance du jour · vélo",plannedrun:"Séance du jour · course"})[k]||"Coach en direct";
      return '<section class="grid liveScreen"><div class="liveTitle"><button class="secondary liveBackButton" id="liveBack">‹</button><h1>'+esc(title)+'</h1></div><article class="panel liveSetup">'+
      (indoor&&!k?'<label>Activité intérieure<select id="liveIndoorKind"><option value="bike">Vélo</option><option value="treadmill">Tapis</option><option value="elliptical">Elliptique</option></select></label>':'')+
      sourceManager(indoor)+(indoor&&(!expected||expected==="bike")?'<label>Programme<select id="liveBikeProgram"><option value="free">Libre guidé</option><option value="endurance35">Endurance progressive · 35 min</option></select></label>':'')+
      '<div class="liveStartActions">'+(indoor?'<button class="primary" id="liveStartIndoor">Démarrer'+(outRun||outBike?" en intérieur":"")+'</button>':'')+(outRun?'<button class="primary" id="liveRun">Démarrer la course extérieure</button>':'')+(outBike?'<button class="primary" id="liveBike">Démarrer le vélo extérieur</button>':'')+
      '</div><details><summary>Autre machine / aide Bluetooth</summary><p>Bluefy doit rester au premier plan.</p><button class="secondary" id="liveConnectStandard">Autre machine Bluetooth</button><button class="secondary" id="openBluefyHelp">Diagnostic avancé</button></details></article></section>';
    }
    const title=s.machineKind?({bike:"Vélo intérieur",treadmill:"Course intérieure",elliptical:"Elliptique"})[s.machineKind]:(s.sport==="run"?"Course extérieure":"Vélo extérieur");
    return '<section class="grid liveScreen"><div class="liveTitle"><h1>'+esc(title)+'</h1><small>'+ (s.pausedAt?"En pause":"En cours")+'</small></div><article class="panel liveDashboard"><div class="liveTimer"><span>Temps actif</span><strong id="liveTime">'+liveClock(liveSeconds(s))+'</strong></div><div class="liveMetrics">'+
    liveTile("Distance","liveDistance",s.hasDistance||s.distanceM>0?(s.distanceM/1000).toFixed(2)+" km":"—")+liveTile("Cardio","liveHeartRate")+liveTile(s.sport==="run"?"Allure":"Vitesse","liveSpeed")+
    (s.sport==="bike"?liveTile("Puissance","livePower")+liveTile("Cadence","liveCadence")+liveTile("Puiss. moyenne","liveAveragePower"):!s.machineKind?liveTile("Dénivelé","liveGain"):liveTile("Cadence","liveCadence"))+
    '</div><div class="liveCompactStatus"><p id="liveHeartSource"></p>'+(s.machineKind==="bike"?'<p id="liveBikePhase"></p>':!s.machineKind?'<p id="liveTerrain"></p>':'')+'<p id="liveSignal">'+esc(s.signal||"")+'</p></div><div class="liveControls">'+
    (s.pausedAt?'<button class="primary" id="liveResume">Reprendre</button>':'<button class="secondary" id="livePause">Pause</button>')+'<button class="secondary" id="liveEncourage">Coach vocal</button><button class="danger liveEnd" id="liveFinish">Terminer et enregistrer</button></div><details><summary>Gérer les sources</summary>'+sourceManager(!!s.machineKind)+'<button class="secondary" id="liveConnectStandard">Autre machine Bluetooth</button></details></article></section>';
  }
  function liveUpdate(){
    const s=state.liveSession;if(!s){bleStatusRefresh();return;}
    const m=bleMachineSnapshot(),known=s.hasDistance||s.distanceM>0, speedKnown=s.machineKind?m.available&&m.kind===s.machineKind&&Number.isFinite(m.speedKmh):s.sampleCount>0&&s.signal?.startsWith("précision");
    const o={liveTime:liveClock(liveSeconds(s)),liveDistance:known?(s.distanceM/1000).toFixed(2)+" km":"—",liveSpeed:speedKnown?(s.sport==="run"?livePace(s.speedMps):(s.speedMps*3.6).toFixed(1)+" km/h"):"—",liveGain:s.sampleCount>0?Math.round(s.gainM)+" m":"—",liveTerrain:"Terrain : "+s.terrain,liveSignal:s.signal};
    for(const [id,value] of Object.entries(o)){const field=el(id);if(field)field.textContent=value;}
    const avg=el("liveAveragePower");if(avg)avg.textContent=s.powerSamples?Math.round(s.powerSum/s.powerSamples)+" W":"—";
    const phase=el("liveBikePhase");if(phase)phase.textContent=liveBikePhase(s).label;bleStatusRefresh();
  }
  function liveSample(s,key,value,source){
    if(!Number.isFinite(value))return;
    s[key+"Sum"]=(s[key+"Sum"]||0)+value;s[key+"Samples"]=(s[key+"Samples"]||0)+1;s[key+"Max"]=Math.max(s[key+"Max"]??value,value);
    if(source){s.liveMetricSources=s.liveMetricSources||{};const counts=s.liveMetricSources[key]||{};counts[source]=(counts[source]||0)+1;s.liveMetricSources[key]=counts;}
  }
  function liveTick(){
    const s=state.liveSession;if(!s||s.pausedAt)return;
    const hr=bleHrSnapshot();if(hr.available)liveSample(s,"heart",hr.bpm,hr.source);
    if(s.machineKind)liveIndoorTick();
    if(s.bikeProgram==="endurance35"&&s.machineKind==="bike")liveBikeCoach(s,bleMachineSnapshot());else liveFreeCue(s);
    if((s.tickCount=(s.tickCount||0)+1)%5===0)put("app",state).catch(()=>{});
    liveUpdate();
  }
  function liveBeginTimer(){if(!liveInterval)liveInterval=setInterval(liveTick,1000);liveIndoorWake();}
  function liveBikePhase(s){
    if(s.bikeProgram!=="endurance35")return {id:"free",label:"Libre · effort confortable",cue:"steady"};
    const t=liveSeconds(s);
    if(t<300)return {id:"warmup",label:"Échauffement · 60–70 rpm",cue:"warmup"};
    if(t<900)return {id:"steady",label:"Endurance facile · 70–80 rpm",cue:"steady"};
    if(t<1500)return {id:"active",label:"Endurance active · 80–90 rpm, sans forcer",cue:"active"};
    if(t<1800)return {id:"easy",label:"Endurance facile · 70–80 rpm",cue:"easy"};
    if(t<2100)return {id:"cool",label:"Retour au calme · 60–65 rpm",cue:"cool"};
    return {id:"done",label:"Programme terminé · termine quand tu es prêt",cue:"finish"};
  }
  async function liveIndoorWake(){try{if(navigator.wakeLock?.request)liveWake=await navigator.wakeLock.request("screen");}catch{}}
  function liveBikeCoach(s,m){
    const phase=liveBikePhase(s),now=Date.now();
    if(s.bikePhase!==phase.id){s.bikePhase=phase.id;s.lastSpeech=now;liveSpeech(phase.cue);return;}
    if(now-s.lastSpeech<150000||phase.id==="done"||phase.id==="free")return;
    s.lastSpeech=now;
    const cycle=["steady","easy","positive","active"];
    s.bikeCueIndex=((s.bikeCueIndex||0)+1)%cycle.length;
    if(Number.isFinite(m.cadenceRpm)&&m.cadenceRpm>105)liveSpeech("slower");else liveEncourage(s);
  }
  function liveTrackStop(){
    if(liveGpsWatch!==null){navigator.geolocation.clearWatch(liveGpsWatch);liveGpsWatch=null;}
    if(liveInterval){clearInterval(liveInterval);liveInterval=null;}
    try{liveWake?.release();}catch{}liveWake=null;
  }
  function liveGpsError(error){
    if(!state.liveSession)return;
    state.liveSession.signal=error.code===1?"permission GPS refusée":"signal indisponible";
    state.liveSession.speedMps=0;liveUpdate();
  }
  function liveTerrain(s,grade){
    const candidate=grade>.035?"Montée":grade<-.035?"Descente":"Plat";
    if(candidate===s.candidate)s.confirms++;else{s.candidate=candidate;s.confirms=1;}
    if(s.confirms<3||candidate===s.terrain)return;
    const previous=s.terrain;s.terrain=candidate;
    const now=Date.now();
    if(previous==="Montée"&&candidate!=="Montée"){
      s.recoveryUntil=now+120000;
      if(now-s.lastSpeech>40000){s.lastSpeech=now;liveSpeech("summit");}
    }else if(candidate==="Montée"&&now-s.lastSpeech>90000){
      s.lastSpeech=now;liveSpeech("climb");
    }else if(candidate==="Descente"&&s.recoveryUntil&&now-s.lastSpeech>30000){
      s.lastSpeech=now;liveSpeech("downhill");
    }
  }
  function liveGpsPosition(pos){
    const s=state.liveSession;if(!s||s.pausedAt)return;
    const c=pos.coords;
    if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||
       !Number.isFinite(c.accuracy)||c.accuracy>45){
      s.signal="précision GPS insuffisante";s.speedMps=0;liveUpdate();return;
    }
    const point={lat:c.latitude,lon:c.longitude,alt:Number.isFinite(c.altitude)?c.altitude:null,
      accuracy:c.accuracy,time:pos.timestamp||Date.now()};
    const prev=s.previous;
    if(prev){
      const seconds=(point.time-prev.time)/1000,meters=liveDistance(prev,point);
      const maxSpeed=s.sport==="bike"?23:8.5; // reject GPS teleportation; not a training limit
      if(seconds>0&&seconds<90&&meters>Math.max(3,c.accuracy*.2)&&meters/seconds<maxSpeed){
        s.distanceM+=meters;s.hasDistance=true;s.speedMps=meters/seconds;
        if(prev.alt!==null&&point.alt!==null){
          const rise=point.alt-prev.alt;
          if(rise>1.5&&rise<Math.max(5,meters*.6))s.gainM+=rise;
          s.altWindow.push({distance:s.distanceM,alt:point.alt});
          s.altWindow=s.altWindow.filter(x=>s.distanceM-x.distance<=150).slice(-60);
          const first=s.altWindow[0],span=s.distanceM-first.distance;
          if(span>45)liveTerrain(s,(point.alt-first.alt)/span);
        }
      }
    }
    s.previous=point;s.signal="précision ~"+Math.round(c.accuracy)+" m";
    s.sampleCount++;liveUpdate();
    if(s.sampleCount%5===0)put("app",state).catch(()=>{});

  }
  async function liveTrackStart(){
    if(liveGpsWatch!==null||!state.liveSession||state.liveSession.pausedAt)return;
    if(navigator.geolocation)try{liveGpsWatch=navigator.geolocation.watchPosition(liveGpsPosition,liveGpsError,{enableHighAccuracy:true,maximumAge:2000,timeout:20000});}catch{state.liveSession.signal="GPS indisponible";}
    liveBeginTimer();
    try{if(navigator.wakeLock?.request)liveWake=await navigator.wakeLock.request("screen");}catch{}
  }
  async function liveStart(sport){
    if(!profile())return alert("Créer un profil pour enregistrer une séance.");

    if(state.liveSession||run())return alert("Une séance est déjà en cours.");
    state.liveSession={id:uid("activity"),profileId:profile().id,sport,plannedSessionId:garminPlannedLiveId(sport),
      startedAt:new Date().toISOString(),pausedAt:null,pausedMs:0,previous:null,
      distanceM:0,gainM:0,speedMps:0,altWindow:[],terrain:"Indéterminé",
      candidate:null,confirms:0,recoveryUntil:null,lastSpeech:Date.now(),nextCueSeconds:600,nextCueDistance:5000,
      signal:"en attente du premier point GPS",sampleCount:0};
    state.ui.view="coachLive";await save();render();await liveTrackStart();liveSpeech("start");
  }
  function liveIndoorTick(){
    const s=state.liveSession;if(!s?.machineKind||s.pausedAt)return;
    const m=bleMachineSnapshot(),same=m.kind===s.machineKind;
    if(same){liveSample(s,"power",m.powerW,m.protocol);liveSample(s,"cadence",m.cadenceRpm,m.protocol);}
    if(!same||!m.available){
      if(s.hadMachine&&!s.machineLost){s.machineLost=true;speak("Signal de la machine perdu. Le chronomètre continue.");}
      s.rawDistanceM=null;s.lastMachineTimestamp=null;s.speedMps=0;s.signal=s.hadMachine?"Machine indisponible · chrono et cardio continuent":"Chronomètre · capteurs facultatifs";return;
    }
    if(s.machineLost){s.machineLost=false;speak("Signal de la machine retrouvé.");}
    s.hadMachine=true;s.hasDistance=true;s.machineProtocol=m.protocol;
    if(!bleMachineReading||s.lastMachineTimestamp===bleMachineReading.timestamp)return;
    const at=bleMachineReading.timestamp;
    if(s.lastMachineTimestamp&&at>s.lastMachineTimestamp&&at-s.lastMachineTimestamp<9000){
      if(Number.isFinite(m.distanceM)&&Number.isFinite(s.rawDistanceM)){const advance=m.distanceM-s.rawDistanceM;if(advance>=0&&advance<150)s.distanceM+=advance;}
      else if(Number.isFinite(m.speedKmh)){s.distanceM+=m.speedKmh/3.6*((at-s.lastMachineTimestamp)/1000);s.estimatedDistance=true;}
    }
    s.lastMachineTimestamp=at;s.rawDistanceM=Number.isFinite(m.distanceM)?m.distanceM:null;s.speedMps=Number.isFinite(m.speedKmh)?m.speedKmh/3.6:0;
    s.signal=(m.device||"Machine")+" · "+(s.estimatedDistance?"distance estimée en partie":"mesures reçues");s.sampleCount++;
  }
  async function liveStartIndoor(){
    if(!profile())return alert("Créer un profil avant la séance.");
    if(state.liveSession||run())return alert("Une séance est déjà active.");
    const m=bleMachineSnapshot(),kind=liveSelectedMachine()||el("liveIndoorKind")?.value||m.kind||"bike",connected=m.kind===kind&&m.available;
    const sport=kind==="bike"?"bike":kind==="elliptical"?"cardio":"run",bikeProgram=kind==="bike"&&el("liveBikeProgram")?.value==="endurance35"?"endurance35":"free";
    state.liveSession={id:uid("activity"),profileId:profile().id,sport,plannedSessionId:garminPlannedLiveId(sport),bikeProgram,machineProtocol:connected?m.protocol:null,bikePhase:bikeProgram==="endurance35"?"warmup":"free",
    machineKind:kind,startedAt:new Date().toISOString(),pausedAt:null,pausedMs:0,distanceM:0,gainM:0,speedMps:0,rawDistanceM:connected&&Number.isFinite(m.distanceM)?m.distanceM:null,lastMachineTimestamp:connected?bleMachineReading?.timestamp||null:null,estimatedDistance:false,hadMachine:connected,hasDistance:connected,
    terrain:"Intérieur",signal:connected?"Machine connectée":"Chronomètre · capteurs facultatifs",sampleCount:0,lastSpeech:Date.now(),nextCueSeconds:600,nextCueDistance:5000};
    state.ui.view="coachLive";await save();render();liveBeginTimer();liveSpeech("start");
  }
  async function livePause(){
    const s=state.liveSession;if(!s||s.pausedAt)return;
    s.pausedAt=new Date().toISOString();liveTrackStop();await save();render();
  }
  async function liveResume(){
    const s=state.liveSession;if(!s||!s.pausedAt)return;
    s.pausedMs+=Date.now()-Date.parse(s.pausedAt);
    s.pausedAt=null;s.previous=null;
    if(s.machineKind){
      const m=bleMachineSnapshot();
      const ready=m.available&&m.kind===s.machineKind;s.rawDistanceM=ready&&Number.isFinite(m.distanceM)?m.distanceM:null;s.lastMachineTimestamp=ready?bleMachineReading?.timestamp||null:null;
      await save();render();liveBeginTimer();
    }else{await save();render();liveTrackStart();}
  }
  async function liveFinish(){
    const s=state.liveSession;if(!s)return;
    if(!confirm("Terminer et conserver cette séance dans l'historique ?"))return;
    const durationSeconds=liveSeconds(s),distanceKm=s.hasDistance||s.distanceM>0?Math.round(s.distanceM)/1000:null;
    liveTrackStop();
    const planned=state.plans.find(p=>p.id===s.plannedSessionId&&p.profileId===s.profileId&&!p.completedAt);
    const completedPlan=planned&&durationSeconds>=Math.max(60,(planned.minutes||0)*60*.8);
    if(completedPlan)planned.completedAt=new Date().toISOString();
    state.activities.push({id:s.id,plannedSessionId:completedPlan?planned.id:null,profileId:s.profileId,type:s.sport,
      source:s.machineKind?(s.machineProtocol?(s.machineProtocol.startsWith("PM5")?"resurgo_pm5_ble":"resurgo_ftms_ble"):"resurgo_indoor_timer"):(distanceKm!==null?"resurgo_gps_phone":"resurgo_outdoor_timer"),machineKind:s.machineKind||null,startedAt:s.startedAt,
      averagePowerW:s.powerSamples?Math.round(s.powerSum/s.powerSamples):null,maxPowerW:s.powerMax??null,averageCadenceRpm:s.cadenceSamples?Math.round(s.cadenceSum/s.cadenceSamples):null,averageHeartRate:s.heartSamples?Math.round(s.heartSum/s.heartSamples):null,maxHeartRate:s.heartMax??null,
      completedAt:new Date().toISOString(),durationSeconds,distanceKm,estimatedDistance:!!s.estimatedDistance,liveMetricSources:s.liveMetricSources||{},bikeProgram:s.bikeProgram||null,hrAvg:s.heartSamples?Math.round(s.heartSum/s.heartSamples):null,hrMax:s.heartMax??null,
      elevationGainM:!s.machineKind&&s.sampleCount>0?Math.round(s.gainM):null,
      status:durationSeconds>30?"completed":"stopped_early",
      notes:s.machineKind?(s.machineProtocol?"Mesures Bluetooth disponibles ; distance estimée si vitesse seule.":"Chronomètre ; mesures absentes non renseignées."):"GPS téléphone si disponible ; cardio BLE facultatif"});
    state.liveSession=null;state.ui.personalPlannedId=null;state.ui.personalLiveKind=null;state.ui.view="session";garminReconcile(s.profileId);refreshPlanAfterActivity(s.profileId);await save();render();
    liveSpeech(durationSeconds>30?"finish":"stop");
  }
  function liveRecoverAfterReload(){
    if(!state.liveSession||state.liveSession.pausedAt)return;
    state.liveSession.previous=null;
    state.liveSession.signal="reprise après interruption : mesures non enregistrées durant l'arrêt";
    if(state.liveSession.machineKind){
      state.liveSession.pausedAt=new Date().toISOString();
      state.liveSession.signal="Reprendre manuellement · machine facultative";
      put("app",state).catch(()=>{});
    }else liveTrackStart();
  }
