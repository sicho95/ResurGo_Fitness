  // ResurGo BLE — reader only; Web Bluetooth central (Bluefy/compatible browser).
  // ResurGo cannot emulate a fitness machine or control its resistance here.
  const BLE_HR=0x180d, BLE_HR_MEAS=0x2a37, BLE_FTMS=0x1826;
  const FTMS_CHARACTERISTICS={treadmill:0x2acd,elliptical:0x2ace,bike:0x2ad2};
  const BLE_MAX_AGE_MS=9000;
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
      cadenceRpm:d?.cadenceRpm??null,device:bleMachineLink?.device?.name||null};
  }
  function bleStatusRefresh(){
    const st=document.getElementById("bleDeviceStatus");
    const hr=bleHrSnapshot(),m=bleMachineSnapshot();
    if(st)st.textContent=bleTextStatus()+" Cardio : "+(hr.available?hr.bpm+" bpm ("+hr.source+")":"aucune mesure fraîche")+
      ". Machine : "+(m.available?m.kind+" / "+(m.distanceM!==null?m.distanceM+" m":m.speedKmh+" km/h"):
        (m.connected?"connectée, données de progression absentes/périmées":"non connectée"))+".";
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
      await bleHrDisconnect();
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
    }catch(e){bleHrState="unavailable";bleStatusRefresh();if(e?.name!=="NotFoundError")alert("Cardio BLE : "+e.message);}
  }
  async function bleMachineDisconnect(){
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
      bleStatusRefresh();
    }catch{bleMachineState="stale";bleStatusRefresh();}
  }
  async function bleMachineConnect(){
    if(!bleAvailable()){alert(bleTextStatus());return;}
    const kind=document.getElementById("bleMachineKind")?.value||"bike";
    if(!FTMS_CHARACTERISTICS[kind]){alert("Sélectionner un type d'appareil valide.");return;}
    try{
      await bleMachineDisconnect();
      bleMachineState="connecting";bleStatusRefresh();
      const device=await navigator.bluetooth.requestDevice({filters:[{services:[BLE_FTMS]}]});
      const service=await (await device.gatt.connect()).getPrimaryService(BLE_FTMS);
      const characteristic=await service.getCharacteristic(FTMS_CHARACTERISTICS[kind]);
      bleMachineLink={device,characteristic};bleMachineKind=kind;
      device.addEventListener("gattserverdisconnected",bleMachineLost);
      characteristic.addEventListener("characteristicvaluechanged",bleMachineNotify);
      await characteristic.startNotifications();
      bleMachineState="connected";bleStatusRefresh();
    }catch(e){bleMachineState="unavailable";bleStatusRefresh();if(e?.name!=="NotFoundError")
      alert("Machine FTMS : "+e.message+" — vérifier la caractéristique et le mode appairage.");}
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
          <option value="bike">Vélo intérieur (FTMS)</option>
        </select>
      </label>
    </div>
    <div class="actions">
      <button type="button" class="primary" id="bleHrConnect">Connecter le cardio</button>
      <button type="button" class="secondary" id="bleHrDisconnect">Déconnecter le cardio</button>
      <button type="button" class="primary" id="bleMachineConnect">Connecter machine FTMS</button>
      <button type="button" class="secondary" id="bleMachineDisconnect">Déconnecter machine</button>
    </div>
    <p id="bleDeviceStatus" role="status" aria-live="polite">${esc(bleTextStatus())}</p>`;
  }
  async function bluefyCopyAddress(){
    const address=location.href.split("#")[0].split("?")[0];
    try{await navigator.clipboard.writeText(address);alert("Adresse HTTPS de ResurGo copiée. Colle-la dans Bluefy.");}
    catch{const e=document.getElementById("bluefyUrl");if(e){const range=document.createRange();range.selectNodeContents(e);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}alert("Sélectionne et copie l'adresse ResurGo affichée, puis colle-la dans Bluefy.");}
  }
