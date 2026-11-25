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
  function liveSpeech(key){
    if(state.settings?.tts?.enabled===false)return;
    const [n,phrase]=liveMessages[key]||liveMessages.positive;
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
  function liveCoachView(){
    const s=state.liveSession;
    if(!s)return `<section class="grid"><h1>Coach en direct</h1><article class="panel">
      <h2>Nouvelle séance</h2><p>Le GPS de l'iPhone suffit dehors. Capteurs optionnels.</p>
      <div class="actions"><button class="secondary" id="openBluefyHelp">ⓘ Comment connecter un capteur dans Bluefy</button></div>
      <div class="actions"><button class="primary" id="liveRun">Course extérieure</button>
      <button class="secondary" id="liveBike">Vélo extérieur</button></div>
      <p><strong>Intérieur FTMS (Bluefy)</strong> : connecter d’abord la machine dans Réglages → Capteurs Bluetooth ⓘ, puis démarrer si ResurGo reçoit réellement vitesse ou distance.</p>
      <label>Programme vélo intérieur<select id="liveBikeProgram"><option value="free">Libre guidé</option><option value="endurance35">Endurance progressive · 35 min</option></select></label>
      <div class="actions"><button class="secondary" id="liveStartIndoor">Démarrer avec machine connectée</button></div>
      <p class="muted">Un cardio seul ne suffit pas pour le guidage intérieur. En cas de coupure de la machine, les conseils de progression sont suspendus. Connexion Bluetooth non garantie sur Safari standard.</p>
      <p class="muted">Pendant une séance, garder la PWA au premier plan : le suivi GPS n'est pas garanti si l'iPhone est verrouillé.</p>
      <button class="secondary" id="liveBack">Retour</button></article></section>`;
    return `<section class="grid"><h1>${s.machineKind?(s.machineKind==="elliptical"?"Elliptique":s.machineKind==="bike"?"Vélo intérieur":"Tapis de course"):(s.sport==="run"?"Course":"Vélo")+" — GPS"}</h1>
      <article class="panel coach">
      <p class="eyebrow">${s.pausedAt?"En pause":"En cours"} · ${s.machineKind?"mesures FTMS":"GPS téléphone"}</p>
      <div class="grid two">
      <div><p class="muted">Temps</p><h2 id="liveTime">${liveClock(liveSeconds(s))}</h2></div>
      <div><p class="muted">Distance</p><h2 id="liveDistance">${(s.distanceM/1000).toFixed(2)} km</h2></div>
      <div><p class="muted">${s.sport==="run"?"Allure":"Vitesse"}</p><h2 id="liveSpeed">—</h2></div>
       ${s.machineKind==="bike"?'<div><p class="muted">Puissance</p><h2 id="livePower">—</h2></div><div><p class="muted">Cadence</p><h2 id="liveCadence">—</h2></div><div><p class="muted">Puissance moyenne mesurée</p><h2 id="liveAveragePower">—</h2></div>':'<div><p class="muted">Dénivelé filtré</p><h2 id="liveGain">'+Math.round(s.gainM)+' m</h2></div>'}
      </div>
      <p id="liveTerrain">Terrain : ${esc(s.terrain)}</p>${s.machineKind==="bike"?'<p id="liveBikePhase" class="notice"></p>':""}
      <p id="liveSignal" class="muted">${s.machineKind?"Machine FTMS":"GPS téléphone"} : ${esc(s.signal)}</p>
      <p id="liveHeartRate" class="muted">Cardio : mesure indisponible</p>
      <button class="secondary" id="openBluefyHelp">ⓘ Informations sur Bluefy / Bluetooth</button>
      ${s.machineKind?'<p id="liveMachineStatus" class="muted">Machine : surveillance du signal Bluetooth.</p>':""}
      ${s.machineKind?"<p class=\"muted\">Distance calculée à partir des mesures FTMS réellement transmises ; peut être estimée si vitesse seule.</p>":""}
      <div class="actions">${s.pausedAt?'<button class="primary" id="liveResume">Reprendre</button>':'<button class="secondary" id="livePause">Pause</button>'}
      <button class="secondary" id="liveEncourage">Encouragement</button>
      <button class="danger" id="liveFinish">Terminer et sauvegarder</button></div>
      </article></section>`;
  }
  function liveUpdate(){
    const s=state.liveSession;if(!s)return;
    const o={liveTime:liveClock(liveSeconds(s)),liveDistance:(s.distanceM/1000).toFixed(2)+" km",
      liveSpeed:s.sport==="run"?livePace(s.speedMps):(s.speedMps*3.6).toFixed(1)+" km/h",
      liveGain:Math.round(s.gainM)+" m",liveTerrain:"Terrain : "+s.terrain,
      liveSignal:(s.machineKind?"Machine FTMS : ":"GPS : ")+s.signal};
    for(const [id,value] of Object.entries(o)){const elmt=el(id);if(elmt)elmt.textContent=value;}
    const avg=el("liveAveragePower");if(avg)avg.textContent=s.powerSamples?Math.round(s.powerSum/s.powerSamples)+" W":"—";
    const phase=el("liveBikePhase");if(phase)phase.textContent=liveBikePhase(s).label;
    bleStatusRefresh();
  }
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
    if(now-s.lastSpeech<150000||phase.id==="done")return;
    s.lastSpeech=now;
    const cycle=["steady","easy","positive","active"];
    s.bikeCueIndex=((s.bikeCueIndex||0)+1)%cycle.length;
    liveSpeech(Number.isFinite(m.cadenceRpm)&&m.cadenceRpm>105?"slower":cycle[s.bikeCueIndex]);
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
        s.distanceM+=meters;s.speedMps=meters/seconds;
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
    if(liveSeconds(s)>300&&Date.now()-s.lastSpeech>300000){
      s.lastSpeech=Date.now();liveSpeech("positive");
    }
  }
  async function liveTrackStart(){
    if(liveGpsWatch!==null||!state.liveSession||state.liveSession.pausedAt)return;
    liveGpsWatch=navigator.geolocation.watchPosition(liveGpsPosition,liveGpsError,
      {enableHighAccuracy:true,maximumAge:2000,timeout:20000});
    if(!liveInterval)liveInterval=setInterval(liveUpdate,1000);
    try{if(navigator.wakeLock?.request)liveWake=await navigator.wakeLock.request("screen");}catch{}
  }
  async function liveStart(sport){
    if(!profile())return alert("Créer un profil pour enregistrer une séance.");
    if(!navigator.geolocation)return alert("GPS indisponible dans ce navigateur.");
    if(state.liveSession)return alert("Une séance est déjà en cours.");
    state.liveSession={id:uid("activity"),profileId:profile().id,sport,
      startedAt:new Date().toISOString(),pausedAt:null,pausedMs:0,previous:null,
      distanceM:0,gainM:0,speedMps:0,altWindow:[],terrain:"Indéterminé",
      candidate:null,confirms:0,recoveryUntil:null,lastSpeech:Date.now(),
      signal:"en attente du premier point GPS",sampleCount:0};
    state.ui.view="coachLive";await save();render();await liveTrackStart();liveSpeech("start");
  }
  function liveIndoorTick(){
    const s=state.liveSession;
    if(!s?.machineKind||s.pausedAt)return;
    const m=bleMachineSnapshot();
    if(!m.available||m.kind!==s.machineKind){
      s.signal="machine déconnectée ou mesure périmée : coaching suspendu";
      if(!s.machineLost){s.machineLost=true;s.rawDistanceM=null;s.lastMachineTimestamp=null;speak("Signal Bluetooth perdu. Les conseils de progression sont suspendus.");}
      s.speedMps=0;liveUpdate();return;
    }
    if(!bleMachineReading||s.lastMachineTimestamp===bleMachineReading.timestamp){
      s.signal="machine FTMS connectée";return;
    }
    const at=bleMachineReading.timestamp;
    if(s.machineLost){s.machineLost=false;s.lastMachineTimestamp=null;s.rawDistanceM=null;speak("Signal Bluetooth retrouvé.");}
    if(s.machineKind==="bike"){
      for(const [key,value] of [["power",m.powerW],["cadence",m.cadenceRpm],["heart",bleHrSnapshot().bpm]])if(Number.isFinite(value)){s[key+"Sum"]=(s[key+"Sum"]||0)+value;s[key+"Samples"]=(s[key+"Samples"]||0)+1;s[key+"Max"]=Math.max(s[key+"Max"]??value,value);}
      liveBikeCoach(s,m);
    }
    if(s.lastMachineTimestamp&&at>s.lastMachineTimestamp&&at-s.lastMachineTimestamp<9000){
      if(Number.isFinite(m.distanceM)&&Number.isFinite(s.rawDistanceM)){
        const advance=m.distanceM-s.rawDistanceM;
        if(advance>=0&&advance<150)s.distanceM+=advance;
      }else if(Number.isFinite(m.speedKmh)){
        s.distanceM+=m.speedKmh/3.6*((at-s.lastMachineTimestamp)/1000);
        s.estimatedDistance=true;
      }
    }
    s.lastMachineTimestamp=at;
    if(Number.isFinite(m.distanceM))s.rawDistanceM=m.distanceM;
    s.speedMps=Number.isFinite(m.speedKmh)?m.speedKmh/3.6:0;
    s.signal="données "+(m.protocol||"FTMS")+" reçues"+(s.estimatedDistance?" (distance estimée)":"");
    if(++s.sampleCount%5===0)put("app",state).catch(()=>{});
    liveUpdate();
  }
  async function liveStartIndoor(){
    if(!profile())return alert("Créer un profil avant la séance.");
    if(state.liveSession)return alert("Une séance est déjà active.");
    const m=bleMachineSnapshot();
    if(!m.available)return alert("Impossible de démarrer : connecter une machine FTMS qui transmet une vitesse ou une distance fraîche. Le cardio seul ne suffit pas.");
    const bikeProgram=el("liveBikeProgram")?.value==="endurance35"?"endurance35":"free";
    state.liveSession={id:uid("activity"),profileId:profile().id,sport:m.kind==="bike"?"bike":"run",bikeProgram,machineProtocol:m.protocol||"FTMS",bikePhase:bikeProgram==="endurance35"?"warmup":"free",
      machineKind:m.kind,startedAt:new Date().toISOString(),pausedAt:null,pausedMs:0,
      distanceM:0,gainM:0,speedMps:0,rawDistanceM:Number.isFinite(m.distanceM)?m.distanceM:null,
      lastMachineTimestamp:bleMachineReading?.timestamp||null,estimatedDistance:false,
      terrain:"Intérieur",signal:"machine FTMS connectée",sampleCount:0,
      lastSpeech:Date.now()};
    state.ui.view="coachLive";await save();render();
    if(!liveInterval)liveInterval=setInterval(()=>{liveIndoorTick();liveUpdate();},1000);
    liveSpeech("start");liveIndoorWake();
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
      if(!m.available||m.kind!==s.machineKind){s.pausedAt=new Date().toISOString();return alert("Reconnecter la machine FTMS avant reprise.");}
      s.rawDistanceM=Number.isFinite(m.distanceM)?m.distanceM:null;
      s.lastMachineTimestamp=bleMachineReading?.timestamp||null;
      await save();render();if(!liveInterval)liveInterval=setInterval(()=>{liveIndoorTick();liveUpdate();},1000);liveIndoorWake();
    }else{await save();render();liveTrackStart();}
  }
  async function liveFinish(){
    const s=state.liveSession;if(!s)return;
    if(!confirm("Terminer et conserver cette séance dans l'historique ?"))return;
    const durationSeconds=liveSeconds(s),distanceKm=Math.round(s.distanceM)/1000;
    liveTrackStop();
    state.activities.push({id:s.id,profileId:s.profileId,type:s.sport,
      source:s.machineKind?(s.machineProtocol==="PM5 CSC/CPS"?"resurgo_pm5_ble":"resurgo_ftms_ble"):"resurgo_gps_phone",machineKind:s.machineKind||null,startedAt:s.startedAt,
      averagePowerW:s.powerSamples?Math.round(s.powerSum/s.powerSamples):null,maxPowerW:s.powerMax??null,averageCadenceRpm:s.cadenceSamples?Math.round(s.cadenceSum/s.cadenceSamples):null,averageHeartRate:s.heartSamples?Math.round(s.heartSum/s.heartSamples):null,maxHeartRate:s.heartMax??null,
      completedAt:new Date().toISOString(),durationSeconds,distanceKm,
      elevationGainM:Math.round(s.gainM),
      status:distanceKm>.05&&durationSeconds>30?"completed":"stopped_early",
      notes:s.machineKind?"Progression mesurée via Bluetooth (distance estimée si vitesse seule). Moyennes des échantillons disponibles, non pondérées. Relecture automatique hors ligne non garantie.":"GPS téléphone ; cardio optionnel BLE selon navigateur ; PWA non garantie en arrière-plan"});
    state.liveSession=null;state.ui.view="today";await save();render();
    liveSpeech(distanceKm>.05?"finish":"stop");
  }
  function liveRecoverAfterReload(){
    if(!state.liveSession||state.liveSession.pausedAt)return;
    state.liveSession.previous=null;
    state.liveSession.signal="reprise après interruption : mesures non enregistrées durant l'arrêt";
    if(state.liveSession.machineKind){
      state.liveSession.pausedAt=new Date().toISOString();
      state.liveSession.signal="machine à reconnecter puis reprendre manuellement";
      put("app",state).catch(()=>{});
    }else liveTrackStart();
  }
