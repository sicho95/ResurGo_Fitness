  // Live coaching outdoor only. Browser GPS cannot guarantee lockscreen continuity on iOS.
  let liveGpsWatch=null,liveInterval=null,liveWake=null;
  const liveMessages={
    start:[1,"C'est parti. Prends le temps de trouver ton rythme."],
    climb:[18,"Regarde quelques mètres devant toi. Une foulée après l'autre."],
    summit:[25,"La montée est passée. Prends quelques instants pour souffler."],
    downhill:[28,"La descente t'aide déjà à avancer. N'en rajoute pas."],
    positive:[57,"Tu prends du temps pour toi, et c'est précieux."],
    finish:[65,"Bravo, tu as terminé ta séance. Savoure cet instant !"],
    stop:[70,"Aujourd'hui était plus difficile. Merci d'avoir écouté tes sensations."]
  };
  function liveSpeech(key){
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
      <div class="actions"><button class="primary" id="liveRun">Course extérieure</button>
      <button class="secondary" id="liveBike">Vélo extérieur</button></div>
      <p class="muted">L'intérieur n'est autorisé qu'avec un équipement transmettant des mesures Bluetooth exploitables. Cette connexion n'est pas encore disponible dans la PWA iOS.</p>
      <p class="muted">Pendant une séance, garder la PWA au premier plan : le suivi GPS n'est pas garanti si l'iPhone est verrouillé.</p>
      <button class="secondary" id="liveBack">Retour</button></article></section>`;
    return `<section class="grid"><h1>${s.sport==="run"?"Course":"Vélo"} — GPS</h1>
      <article class="panel coach">
      <p class="eyebrow">${s.pausedAt?"En pause":"En cours"} · téléphone uniquement</p>
      <div class="grid two">
      <div><p class="muted">Temps</p><h2 id="liveTime">${liveClock(liveSeconds(s))}</h2></div>
      <div><p class="muted">Distance</p><h2 id="liveDistance">${(s.distanceM/1000).toFixed(2)} km</h2></div>
      <div><p class="muted">${s.sport==="run"?"Allure":"Vitesse"}</p><h2 id="liveSpeed">—</h2></div>
      <div><p class="muted">Dénivelé filtré</p><h2 id="liveGain">${Math.round(s.gainM)} m</h2></div>
      </div>
      <p id="liveTerrain">Terrain : ${esc(s.terrain)}</p>
      <p id="liveSignal" class="muted">GPS : ${esc(s.signal)} · cardio absent, non estimé.</p>
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
      liveSignal:"GPS : "+s.signal+" · cardio absent, non estimé."};
    for(const [id,value] of Object.entries(o)){const elmt=el(id);if(elmt)elmt.textContent=value;}
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
  async function livePause(){
    const s=state.liveSession;if(!s||s.pausedAt)return;
    s.pausedAt=new Date().toISOString();liveTrackStop();await save();render();
  }
  async function liveResume(){
    const s=state.liveSession;if(!s||!s.pausedAt)return;
    s.pausedMs+=Date.now()-Date.parse(s.pausedAt);
    s.pausedAt=null;s.previous=null;await save();render();liveTrackStart();
  }
  async function liveFinish(){
    const s=state.liveSession;if(!s)return;
    if(!confirm("Terminer et conserver cette séance dans l'historique ?"))return;
    const durationSeconds=liveSeconds(s),distanceKm=Math.round(s.distanceM)/1000;
    liveTrackStop();
    state.activities.push({id:s.id,profileId:s.profileId,type:s.sport,
      source:"resurgo_gps_phone",startedAt:s.startedAt,
      completedAt:new Date().toISOString(),durationSeconds,distanceKm,
      elevationGainM:Math.round(s.gainM),
      status:distanceKm>.05&&durationSeconds>30?"completed":"stopped_early",
      notes:"GPS téléphone seul, cardio non mesuré; PWA non garantie en arrière-plan"});
    state.liveSession=null;state.ui.view="today";await save();render();
    liveSpeech(distanceKm>.05?"finish":"stop");
  }
  function liveRecoverAfterReload(){
    if(!state.liveSession||state.liveSession.pausedAt)return;
    state.liveSession.previous=null;
    state.liveSession.signal="reprise après interruption : distance non mesurée durant l'arrêt";
    liveTrackStart();
  }
