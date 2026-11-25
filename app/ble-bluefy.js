  // ResurGo BLE — reader only; Web Bluetooth central (Bluefy/compatible browser).
  // ResurGo cannot emulate a fitness machine or control its resistance here.
  const BLE_HR=0x180d, BLE_HR_MEAS=0x2a37, BLE_FTMS=0x1826;
  const FTMS_CHARACTERISTICS={treadmill:0x2acd,elliptical:0x2ace,bike:0x2ad2};
  const BLE_MAX_AGE_MS=9000;
  const BLE_CSC=0x1816,BLE_CSC_MEAS=0x2a5b,BLE_POWER=0x1818,BLE_POWER_MEAS=0x2a63;
  const pm5Uuid=id=>"ce06"+id.toString(16).padStart(4,"0")+"-43e5-11e4-916c-0800200c9a66";
  const PM5_DATA=pm5Uuid(0x30);
  let bleMachineTrace=[],bleMachineSelected=null;
  function bleErrorText(e){return typeof e==="string"?e:e?.message||e?.name||JSON.stringify(e)||"erreur Bluetooth sans détail";}
  function bleTrace(s){bleMachineTrace.push(String(s).slice(0,200));if(bleMachineTrace.length>24)bleMachineTrace.shift();bleStatusRefresh();}
  function bleParsePm5(id,v){
    const result={};
    if(id===0x31){if(v.byteLength<6)throw Error("PM5 31 : paquet court");result.distanceM=bleReadU24(v,3)/10;}
    if(id===0x32){if(v.byteLength<7)throw Error("PM5 32 : paquet court");const speed=v.getUint16(3,true)*.0036;if(speed<=120)result.speedKmh=speed;const rpm=v.getUint8(5),hr=v.getUint8(6);if(rpm<=250)result.cadenceRpm=rpm;if(hr>=25&&hr<=245)result.heartRate=hr;}
    if(id===0x36){if(v.byteLength<5)throw Error("PM5 36 : paquet court");const watts=v.getUint16(3,true);if(watts<=3000)result.powerW=watts;}
    return result;
  }
  function blePm5Notify(event,id){
    if(!bleMachineLink)return;
    try{
      const parsed=bleParsePm5(id,event.target.value),now=Date.now(),dev=bleMachineLink.device.id||"pm5";
      for(const [k,v] of Object.entries(parsed))bleBikeMetrics[k]={value:v,at:now};
      const snapshot={kind:"bike",timestamp:now};
      for(const [k,m] of Object.entries(bleBikeMetrics))if(now-m.at<BLE_MAX_AGE_MS)snapshot[k]=m.value;
      const progressAt=Math.max(bleBikeMetrics.distanceM?.at||0,bleBikeMetrics.speedKmh?.at||0);
      if(progressAt&&now-progressAt<BLE_MAX_AGE_MS){snapshot.timestamp=progressAt;bleMachineReading=snapshot;bleMachineState="live";}
      for(const [key,metric] of Object.entries({distanceM:"distance",speedKmh:"speed",cadenceRpm:"cadence",powerW:"power",heartRate:"heartRate"}))if(Number.isFinite(parsed[key]))bleIngestMetric(metric,key==="speedKmh"?parsed[key]/3.6:parsed[key],"fitness_machine",dev,now);
      bleStatusRefresh();
    }catch(e){bleTrace(bleErrorText(e));}
  }
  async function bleSubscribeBike(server,serviceId,charId,handler){
    const service=await server.getPrimaryService(serviceId);
    const characteristic=await service.getCharacteristic(charId);
    characteristic.addEventListener("characteristicvaluechanged",handler);
    try{await characteristic.startNotifications();}catch(e){try{characteristic.removeEventListener("characteristicvaluechanged",handler);}catch{}throw e;}
    bleBikeLinks.push({characteristic,handler});bleTrace("Notifications OK : "+charId);
  }
  let bleBikeLinks=[],bleBikePrevious={},bleBikeMetrics={},bleMachineProtocol="FTMS";
  const BIKEERG_WHEEL_M=2; // Concept2 recommended virtual wheel size; only for PM5.
  function bleCscPacket(view){
    if(!(view instanceof DataView)||view.byteLength<1)throw Error("CSC : paquet court");
    const flags=view.getUint8(0);let i=1,result={};
    if(flags&1){if(view.byteLength<i+6)throw Error("CSC : roue tronquée");result.wheel=view.getUint32(i,true);result.wheelTime=view.getUint16(i+4,true);i+=6;}
    if(flags&2){if(view.byteLength<i+4)throw Error("CSC : pédalier tronqué");result.crank=view.getUint16(i,true);result.crankTime=view.getUint16(i+2,true);}
    return result;
  }
  function bleCyclingPowerPacket(view){
    if(!(view instanceof DataView)||view.byteLength<4)throw Error("CPS : paquet court");
    const flags=view.getUint16(0,true),powerW=view.getInt16(2,true);let i=4,result={powerW};
    if(flags&1)i+=1;if(flags&4)i+=2;
    if(flags&16){if(view.byteLength<i+6)throw Error("CPS : roue tronquée");result.wheel=view.getUint32(i,true);result.wheelTime=view.getUint16(i+4,true);i+=6;}
    if(flags&32){if(view.byteLength<i+4)throw Error("CPS : pédalier tronqué");result.crank=view.getUint16(i,true);result.crankTime=view.getUint16(i+2,true);}
    return result;
  }
  function bleBikeDeltas(current,previous,wheelHz=1024){
    const result={};
    if(Number.isFinite(current.wheel)&&Number.isFinite(previous?.wheel)){
      const n=(current.wheel-previous.wheel)>>>0,t=(current.wheelTime-previous.wheelTime+65536)%65536;
      if(t>0&&n<500){const speed=n*BIKEERG_WHEEL_M*wheelHz/t*3.6;if(speed<=120)result.speedKmh=speed;}
      if(n===0)result.speedKmh=0;
    }
    if(Number.isFinite(current.crank)&&Number.isFinite(previous?.crank)){
      const n=(current.crank-previous.crank+65536)%65536,t=(current.crankTime-previous.crankTime+65536)%65536;
      if(t>0&&n<300){const rpm=n*60*1024/t;if(rpm<=250)result.cadenceRpm=rpm;}
      if(n===0)result.cadenceRpm=0;
    }
    return result;
  }
  function bleBikeNotify(event,protocol){
    if(!bleMachineLink)return;
    try{
      const current=protocol==="CSC"?bleCscPacket(event.target.value):bleCyclingPowerPacket(event.target.value);
      const now=Date.now(),old=bleBikePrevious[protocol],delta=old&&now-old.at<BLE_MAX_AGE_MS?bleBikeDeltas(current,old.data,protocol==="CSC"?1024:2048):{};
      // Wheel/crank event timestamps can remain unchanged between notifications.
      // Retain the last speed until new revolutions or 3 seconds of inactivity.
      if(delta.speedKmh===0&&old&&now-(old.wheelMove||now)<3000)delete delta.speedKmh;
      if(delta.cadenceRpm===0&&old&&now-(old.crankMove||now)<3000)delete delta.cadenceRpm;
      bleBikePrevious[protocol]={data:current,at:now,wheelMove:!old||current.wheel!==old.data.wheel?now:old.wheelMove,crankMove:!old||current.crank!==old.data.crank?now:old.crankMove};
      const metrics={...delta};if(Number.isFinite(current.powerW))metrics.powerW=current.powerW;
      for(const [key,value] of Object.entries(metrics))bleBikeMetrics[key]={value,at:now};
      const snapshot={kind:"bike",timestamp:now};
      for(const [key,metric] of Object.entries(bleBikeMetrics))if(now-metric.at<BLE_MAX_AGE_MS)snapshot[key]=metric.value;
      if(Number.isFinite(snapshot.speedKmh)){bleMachineReading=snapshot;bleMachineState="live";}
      else if(bleMachineReading)bleMachineReading={...snapshot,timestamp:bleMachineReading.timestamp};
      const dev=bleMachineLink.device.id||"pm5";
      for(const [key,metric] of Object.entries({speedKmh:"speed",cadenceRpm:"cadence",powerW:"power"}))if(Number.isFinite(metrics[key]))bleIngestMetric(metric,key==="speedKmh"?metrics[key]/3.6:metrics[key],"fitness_machine",dev,now);
      bleStatusRefresh();
    }catch(e){bleStatusRefresh();}
  }
  let bleHrLink=null,bleMachineLink=null,bleHrState="unavailable",bleMachineState="unavailable";
  let bleHrReading=null,bleMachineReading=null,bleHrKind="chest_strap",bleMachineKind=null;
  const bleAvailable=()=>Boolean(globalThis.isSecureContext&&navigator.bluetooth?.requestDevice);
  function bleTextStatus(){
    return bleAvailable()?"Bluetooth web disponible : ouvrir l’association depuis cette page.":"Bluetooth web indisponible ici. Sur iPhone, ouvrir ResurGo DANS Bluefy (pas l’icône PWA Safari).";
  }
  function bleHeartPacket(view){
    if(!(view instanceof DataView)||view.byteLength<2)throw Error("FC : paquet court");
    const wide=(view.getUint8(0)&1)!==0;
    if(view.byteLength<(wide?3:2))throw Error("FC : valeur tronquée");
    const bpm=wide?view.getUint16(1,true):view.getUint8(1);
    if(bpm<25||bpm>245)throw Error("FC : valeur incohérente");
    return {heartRate:bpm};
  }
  function bleReadU24(view,offset){
    if(offset+3>view.byteLength)throw Error("FTMS : distance tronquée");
    return view.getUint8(offset)|(view.getUint8(offset+1)<<8)|(view.getUint8(offset+2)<<16);
  }
  function bleParseFtms(kind,view){
    if(!(view instanceof DataView))throw Error("FTMS : paquet invalide");
    const cross=kind==="elliptical",header=cross?3:2;
    if(view.byteLength<header)throw Error("FTMS : en-tête absent");
    const flags=cross?(view.getUint8(0)|(view.getUint8(1)<<8)|(view.getUint8(2)<<16)):view.getUint16(0,true);
    let i=header, result={kind,flags};
    function u16(){if(i+2>view.byteLength)throw Error("FTMS : donnée tronquée");const n=view.getUint16(i,true);i+=2;return n;}
    // Bit 0 = "More Data": when 1 the instantaneous speed is omitted.
    if(!(flags&1))result.speedKmh=u16()/100;
    if(flags&2)result.averageSpeedKmh=u16()/100;
    if(kind==="bike"){
      if(flags&4)result.cadenceRpm=u16()/2;
      if(flags&8)result.averageCadenceRpm=u16()/2;
      if(flags&16){result.distanceM=bleReadU24(view,i);i+=3;}
      if(flags&32)result.resistanceLevel=(u16()<<16>>16)/10;
      if(flags&64)result.powerW=u16()<<16>>16;
      if(flags&128)result.averagePowerW=u16()<<16>>16;
      if(flags&256){u16();u16();if(i>=view.byteLength)throw Error("FTMS : énergie tronquée");i++;}
      if(flags&512){if(i>=view.byteLength)throw Error("FTMS : FC tronquée");const bpm=view.getUint8(i++);if(bpm>=25&&bpm<=245)result.heartRate=bpm;}
    }else if(flags&4){result.distanceM=bleReadU24(view,i);i+=3;}
    // Cross trainer 3-byte flags: step rate and later fields deliberately not
    // decoded until hardware is tested; no guessed machine distance or speed.
    if(result.speedKmh!==undefined&&(!Number.isFinite(result.speedKmh)||result.speedKmh<0||result.speedKmh>120))
      throw Error("FTMS : vitesse impossible");
    if(result.distanceM!==undefined&&(!Number.isFinite(result.distanceM)||result.distanceM<0))
      throw Error("FTMS : distance invalide");
    return result;
  }
  function bleIngestMetric(metric,value,sourceType,deviceId,timestamp=Date.now()){
    if(!Number.isFinite(value))return;
    if(!globalThis.resurgoLiveSensors)globalThis.resurgoLiveSensors={};
    sensorAccept(globalThis.resurgoLiveSensors,{
      metric,value,sourceType,deviceId,timestamp,quality:1,maxAgeMs:BLE_MAX_AGE_MS});
  }
  function bleReadingIsFresh(reading){return Boolean(reading&&Date.now()-reading.timestamp<BLE_MAX_AGE_MS);}
  function bleMetric(metric){
    return chooseSensorMetric(metric,globalThis.resurgoLiveSensors?.[metric]||[],Date.now());
  }
  function bleHrSnapshot(){
    const reading=bleMetric("heartRate");
    return {available:reading.available,bpm:reading.available?reading.value:null,
      source:reading.available?reading.source:null,
      device:bleHrLink?.device?.name||null,
      status:bleHrState};
  }
  function bleMachineSnapshot(){
    const fresh=bleMachineState==="live"&&bleReadingIsFresh(bleMachineReading);
    const d=fresh?bleMachineReading:null;
    const progressive=Boolean(d&&(Number.isFinite(d.distanceM)||Number.isFinite(d.speedKmh)));
    return {connected:bleMachineLink?.device?.gatt?.connected||false,
      available:progressive,kind:bleMachineKind,state:fresh?"live":bleMachineState==="live"?"stale":bleMachineState,
      speedKmh:progressive?d.speedKmh??null:null,distanceM:progressive?d.distanceM??null:null,
      cadenceRpm:d?.cadenceRpm??null,powerW:d?.powerW??null,protocol:bleMachineProtocol,device:bleMachineLink?.device?.name||null};
  }
  function bleStatusRefresh(){
    const st=document.getElementById("bleDeviceStatus");
    const hr=bleHrSnapshot(),m=bleMachineSnapshot();
    if(st)st.textContent=bleTextStatus()+" Cardio : "+(hr.available?hr.bpm+" bpm ("+hr.source+")":"aucune mesure fraîche")+
      ". Machine : "+(m.available?m.kind+" / "+(m.distanceM!==null?m.distanceM+" m":m.speedKmh+" km/h"):
        (m.connected?"connectée, données de progression absentes/périmées":"non connectée"))+".";
    const diagnostic=document.getElementById("bleBikeDiagnostic");
    if(diagnostic)diagnostic.textContent=JSON.stringify({protocol:m.protocol,device:m.device||bleMachineSelected,state:m.state,trace:bleMachineTrace,speedKmh:m.speedKmh,distanceM:m.distanceM,cadenceRpm:m.cadenceRpm,powerW:m.powerW,heartRate:hr.bpm,heartSource:hr.source});
    for(const [id,value,unit] of [["liveCadence",m.cadenceRpm," rpm"],["livePower",m.powerW," W"]]){const field=document.getElementById(id);if(field)field.textContent=Number.isFinite(value)?Math.round(value)+unit:"—";}
    const hc=document.getElementById("liveHeartRate");
    if(hc)hc.textContent=hr.available?hr.bpm+" bpm ("+hr.source+")":"— (non mesuré)";
    const ms=document.getElementById("liveMachineStatus");
    if(ms)ms.textContent=m.available?
      "Machine "+m.kind+" : données reçues":m.connected?"Machine : mesures indisponibles — coaching suspendu":
      "Machine déconnectée — coaching suspendu";
  }
  async function bleHrDisconnect(){
    if(bleHrLink){
      try{bleHrLink.characteristic.removeEventListener("characteristicvaluechanged",bleHrNotify);}catch{}
      try{bleHrLink.device.removeEventListener("gattserverdisconnected",bleHrLost);}catch{}
      try{bleHrLink.device.gatt?.disconnect();}catch{}
    }
    bleHrLink=null;bleHrReading=null;bleHrState="unavailable";
    bleStatusRefresh();
  }
  function bleHrLost(){bleHrState="lost";bleHrReading=null;bleStatusRefresh();}
  function bleHrNotify(event){
    try{
      const data=bleHeartPacket(event.target.value);
      bleHrReading={...data,timestamp:Date.now()};
      bleHrState="live";
      bleIngestMetric("heartRate",data.heartRate,bleHrKind,bleHrLink?.device?.id||"ble_hr");
      bleStatusRefresh();
    }catch{bleHrState="stale";bleStatusRefresh();}
  }
  async function bleHrConnect(){
    if(!bleAvailable()){alert(bleTextStatus());return;}
    try{
      bleHrDisconnect();
      bleHrKind=document.getElementById("bleHrSourceType")?.value==="watch"?"watch":"chest_strap";
      bleHrState="connecting";bleStatusRefresh();
      const device=await navigator.bluetooth.requestDevice({filters:[{services:[BLE_HR]}]});
      const server=await device.gatt.connect();
      const service=await server.getPrimaryService(BLE_HR);
      const characteristic=await service.getCharacteristic(BLE_HR_MEAS);
      bleHrLink={device,characteristic};
      device.addEventListener("gattserverdisconnected",bleHrLost);
      characteristic.addEventListener("characteristicvaluechanged",bleHrNotify);
      await characteristic.startNotifications();
      bleHrState="connected";bleStatusRefresh();
    }catch(e){bleHrState="unavailable";bleStatusRefresh();if(e?.name!=="NotFoundError")alert("Cardio BLE : "+bleErrorText(e));}
  }
  async function bleMachineDisconnect(){
    for(const link of bleBikeLinks){try{link.characteristic.removeEventListener("characteristicvaluechanged",link.handler);}catch{}}
    bleBikeLinks=[];bleBikePrevious={};bleBikeMetrics={};bleMachineProtocol="FTMS";
    if(bleMachineLink){
      try{bleMachineLink.characteristic.removeEventListener("characteristicvaluechanged",bleMachineNotify);}catch{}
      try{bleMachineLink.device.removeEventListener("gattserverdisconnected",bleMachineLost);}catch{}
      try{bleMachineLink.device.gatt?.disconnect();}catch{}
    }
    bleMachineLink=null;bleMachineReading=null;bleMachineKind=null;bleMachineState="unavailable";
    bleStatusRefresh();
  }
  function bleMachineLost(){bleMachineState="lost";bleMachineReading=null;bleStatusRefresh();}
  function bleMachineNotify(event){
    if(!bleMachineLink)return;
    try{
      const parsed=bleParseFtms(bleMachineKind,event.target.value);
      if(parsed.speedKmh===undefined&&parsed.distanceM===undefined)return;
      bleMachineReading={...parsed,timestamp:Date.now()};
      bleMachineState="live";
      const dev=bleMachineLink.device.id||"ftms";
      if(Number.isFinite(parsed.speedKmh))bleIngestMetric("speed",parsed.speedKmh/3.6,"fitness_machine",dev);
      if(Number.isFinite(parsed.distanceM))bleIngestMetric("distance",parsed.distanceM,"fitness_machine",dev);
      if(Number.isFinite(parsed.cadenceRpm))bleIngestMetric("cadence",parsed.cadenceRpm,"fitness_machine",dev);
      if(Number.isFinite(parsed.powerW))bleIngestMetric("power",parsed.powerW,"fitness_machine",dev);
      if(Number.isFinite(parsed.heartRate))bleIngestMetric("heartRate",parsed.heartRate,"fitness_machine",dev);
      bleStatusRefresh();
    }catch{bleMachineState="stale";bleStatusRefresh();}
  }
  async function bleMachineConnect(mode="standard"){
    if(!bleAvailable()){alert(bleTextStatus());return;}
    const kind=mode==="pm5"?"bike":document.getElementById("bleMachineKind")?.value||"bike";
    if(!FTMS_CHARACTERISTICS[kind]){alert("Sélectionner un type d'appareil valide.");return;}
    bleMachineDisconnect();
    bleMachineTrace=[];bleMachineSelected=null;
    bleMachineState="connecting";bleStatusRefresh();
    let stage="sélection de l'appareil";
    try{
      // Bluefy field test: one service filter opens the picker, mixed name/service filters do not.
      // PM5 direct button uses the proprietary data service; standard bike uses the same
      // single FTMS filter as treadmill and elliptical, with other services authorized.
      const options=kind==="bike"?(mode==="pm5"?{acceptAllDevices:true,optionalServices:[PM5_DATA,BLE_FTMS,BLE_CSC,BLE_POWER]}:{filters:[{services:[BLE_FTMS]}],optionalServices:[PM5_DATA,BLE_CSC,BLE_POWER]}):{filters:[{services:[BLE_FTMS]}]};
      const device=await navigator.bluetooth.requestDevice(options);
      bleMachineSelected=device.name||"Appareil sans nom";
      bleTrace("Appareil : "+bleMachineSelected);
      stage="connexion GATT";
      const server=await device.gatt.connect();
      bleMachineLink={device,characteristic:null};bleMachineKind=kind;
      device.addEventListener("gattserverdisconnected",bleMachineLost);
      bleTrace("GATT connecté");
      const isPm5=mode==="pm5"||/PM5|Concept2|BikeErg/i.test(device.name||"");
      let connected=false;
      if(mode!=="pm5"){
        stage="FTMS "+FTMS_CHARACTERISTICS[kind].toString(16);
        try{
          const service=await server.getPrimaryService(BLE_FTMS);
          const characteristic=await service.getCharacteristic(FTMS_CHARACTERISTICS[kind]);
          bleMachineLink.characteristic=characteristic;
          characteristic.addEventListener("characteristicvaluechanged",bleMachineNotify);
          await characteristic.startNotifications();connected=true;bleTrace("FTMS notifications OK");
        }catch(error){bleTrace(stage+" : "+bleErrorText(error));try{bleMachineLink.characteristic?.removeEventListener("characteristicvaluechanged",bleMachineNotify);}catch{}bleMachineLink.characteristic=null;if(kind!=="bike"||!isPm5)throw error;}
      }
      if(!connected&&kind==="bike"&&isPm5){
        stage="Concept2 natif";bleMachineProtocol="PM5 natif";
        let progress=false;
        for(const id of [0x31,0x32,0x36]){
          try{await bleSubscribeBike(server,PM5_DATA,pm5Uuid(id),event=>blePm5Notify(event,id));if(id===0x31||id===0x32)progress=true;}
          catch(error){bleTrace("PM5 "+id.toString(16)+" : "+bleErrorText(error));}
        }
        connected=progress;
        if(!connected){
          for(const link of bleBikeLinks){try{link.characteristic.removeEventListener("characteristicvaluechanged",link.handler);await link.characteristic.stopNotifications?.();}catch{}}
          bleBikeLinks=[];bleBikeMetrics={};bleMachineReading=null;
          stage="CSC/CPS";bleMachineProtocol="PM5 CSC/CPS";
          for(const [serviceId,charId,protocol] of [[BLE_CSC,BLE_CSC_MEAS,"CSC"],[BLE_POWER,BLE_POWER_MEAS,"CPS"]]){
            try{await bleSubscribeBike(server,serviceId,charId,event=>bleBikeNotify(event,protocol));}
            catch(error){bleTrace(protocol+" : "+bleErrorText(error));}
          }
          connected=bleBikeLinks.length>0;
        }
      }
      if(!connected)throw Error("Aucun service de mesure compatible");
      if(bleMachineState!=="live")bleMachineState="connected";bleStatusRefresh();
    }catch(e){bleTrace(stage+" : "+bleErrorText(e));await bleMachineDisconnect();bleMachineState="unavailable";bleStatusRefresh();if(e?.name!=="NotFoundError")
      alert("Machine BLE — "+stage+" : "+bleErrorText(e)+". Ouvrir Diagnostic vélo. Pour un PM5, essayer le bouton Concept2 direct.");}
  }

  function bluefyHelpPanel(){
    const appUrl=location.href.split("#")[0].split("?")[0];
    return `<details class="panel" id="bluefyHelp">
      <summary aria-label="Informations pour connecter les capteurs avec Bluefy">ⓘ Utiliser Bluefy sur iPhone — mode d'emploi</summary>
      <p><strong>Bluefy est un navigateur BLE</strong> : il faut ouvrir ResurGo directement DANS Bluefy, pas dans la PWA installée depuis Safari. Les deux navigateurs ont leurs propres données locales ; pour retrouver les profils, utiliser la synchronisation NAS ou la sauvegarde chiffrée.</p>
      <ol>
        <li>Sur l’iPhone, activer le Bluetooth et allumer la ceinture, la montre en mode diffusion cardio ou la machine FTMS.</li>
        <li><a href="https://apps.apple.com/fr/app/bluefy-web-ble-browser/id1492822055" target="_blank" rel="noopener noreferrer">Installer / ouvrir Bluefy sur l’App Store</a>.</li>
        <li>Dans Bluefy, saisir l’adresse HTTPS de ResurGo : <code id="bluefyUrl">${esc(appUrl)}</code>. <button type="button" class="secondary" id="copyBluefyUrl">Copier l’adresse</button></li>
        <li>Dans ResurGo ouvert dans Bluefy, aller à <strong>Réglages → Capteurs Bluetooth</strong>, choisir le type puis toucher <strong>Connecter</strong>. Autoriser l’appareil dans la fenêtre Bluetooth.</li>
        <li>Attendre une <strong>mesure réelle</strong> et vérifiable. « Connecté » sans vitesse, distance ou mesure cardio fraîche ne signifie pas « prêt ».</li>
        <li>Pour la montre Apple Watch, il faut une application de diffusion du cardio compatible BLE si elle ne diffuse pas directement. L'application ResurGo ne crée ni ne signe d'application watchOS.</li>
      </ol>
      <p><strong>Limites :</strong> Bluefy doit rester au premier plan pendant l'utilisation ; réception BLE, GPS et son en arrière-plan non garantis sur iPhone. Une machine « Bluetooth » n'est pas forcément FTMS. Une Apple Watch ne diffuse pas automatiquement son GPS ni son altitude au téléphone.</p>
    </details>
    <div class="grid two">
      <label>Source de fréquence cardiaque
        <select id="bleHrSourceType">
          <option value="chest_strap">Ceinture cardio (prioritaire)</option>
          <option value="watch">Montre / diffusion FC BLE</option>
        </select>
      </label>
      <label>Type de machine
        <select id="bleMachineKind">
          <option value="treadmill">Tapis de course (FTMS)</option>
          <option value="elliptical">Elliptique / cross trainer (FTMS)</option>
          <option value="bike">Vélo intérieur (FTMS / Concept2 PM5)</option>
        </select>
      </label>
    </div>
    <div class="actions">
      <button type="button" class="primary" id="bleHrConnect">Connecter le cardio</button>
      <button type="button" class="secondary" id="bleHrDisconnect">Déconnecter le cardio</button>
      <button type="button" class="primary" id="bleMachineConnect">Connecter machine FTMS / PM5</button>
      <button type="button" class="secondary" id="blePm5Connect">Connecter Concept2 PM5 (direct)</button>
      <button type="button" class="secondary" id="bleMachineDisconnect">Déconnecter machine</button>
    </div>
    <p id="bleDeviceStatus" role="status" aria-live="polite">${esc(bleTextStatus())}</p><details open><summary>Diagnostic vélo (copier le texte)</summary><p id="bleBikeDiagnostic">En attente de connexion</p></details>`;
  }
  async function bluefyCopyAddress(){
    const address=location.href.split("#")[0].split("?")[0];
    try{await navigator.clipboard.writeText(address);alert("Adresse HTTPS de ResurGo copiée. Colle-la dans Bluefy.");}
    catch{const e=document.getElementById("bluefyUrl");if(e){const range=document.createRange();range.selectNodeContents(e);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}alert("Sélectionne et copie l'adresse ResurGo affichée, puis colle-la dans Bluefy.");}
  }
