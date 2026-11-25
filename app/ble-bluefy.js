  // ResurGo BLE — reader only; Web Bluetooth central (Bluefy/compatible browser).
  // ResurGo cannot emulate a fitness machine or control its resistance here.
  const BLE_HR=0x180d, BLE_HR_MEAS=0x2a37, BLE_FTMS=0x1826;
  const FTMS_CHARACTERISTICS={treadmill:0x2acd,elliptical:0x2ace,bike:0x2ad2};
  const BLE_MAX_AGE_MS=9000;
  const BLE_CSC=0x1816,BLE_CSC_MEAS=0x2a5b,BLE_POWER=0x1818,BLE_POWER_MEAS=0x2a63;
  const pm5Uuid=id=>"ce06"+id.toString(16).padStart(4,"0")+"-43e5-11e4-916c-0800200c9a66";
  const PM5_DISCOVERY=pm5Uuid(0),PM5_DATA=pm5Uuid(0x30);
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
  const bleHeartLinks=new Map();
  const bleSourceEnabled={watch:true,chest_strap:true,fitness_machine:true};
  function bleForgetDevice(id){if(!id)return;for(const k of Object.keys(globalThis.resurgoLiveSensors||{}))globalThis.resurgoLiveSensors[k]=globalThis.resurgoLiveSensors[k].filter(x=>x.deviceId!==id);}
  let bleHrLink=null,bleMachineLink=null,bleHrState="unavailable",bleMachineState="unavailable";
  let bleHrReading=null,bleMachineReading=null,bleHrKind="chest_strap",bleMachineKind=null;
  const bleAvailable=()=>Boolean(globalThis.isSecureContext&&navigator.bluetooth?.requestDevice);
  let bleBeacioReady=false;
  function bleCapabilities(){
    const ua=navigator.userAgent||"",ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    const standalone=!!navigator.standalone||(typeof matchMedia==="function"&&matchMedia("(display-mode: standalone)").matches);
    const safari=ios&&/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS|Bluefy/i.test(ua)&&!standalone;
    return {ios,safari,standalone,secure:!!globalThis.isSecureContext,available:bleAvailable(),beacio:bleBeacioReady||!!navigator.beacio,background:typeof navigator.beacio?.backgroundSync?.requestBackgroundConnection==="function"};
  }
  function bleCapabilityText(){
    const c=bleCapabilities();
    if(!c.secure)return "Bluetooth : contexte HTTPS requis.";
    if(c.available)return c.beacio?"beacio actif sur cette page · Bluetooth disponible":"Web Bluetooth disponible · aucun plugin requis";
    if(c.ios&&c.standalone)return "Bluetooth indisponible dans cette PWA autonome. Ouvrir cette adresse dans Safari avec beacio.";
    if(c.safari)return "Safari : beacio non détecté sur cette page. Installer, activer ou autoriser l’extension.";
    if(c.ios)return "Bluetooth indisponible dans ce navigateur. Safari + beacio est recommandé.";
    return "Web Bluetooth indisponible dans ce navigateur. Utiliser un navigateur compatible.";
  }
  function bleCapabilityPanel(){
    const c=bleCapabilities();
    return '<div class="bleCapability"><strong id="bleCapabilityText" role="status">'+esc(bleCapabilityText())+'</strong><div id="bleInstallHelp" '+(!c.ios||c.available?"hidden":"")+'><p class="muted">Sur iPhone/iPad : installer beacio gratuitement, activer son extension dans Safari, puis autoriser ce site. Si ResurGo est ouvert depuis son icône, ouvrir plutôt un onglet Safari.</p><a class="secondary" href="https://apps.apple.com/fr/app/beacio/id6761301368" target="_blank" rel="noopener noreferrer">Installer beacio gratuitement</a> <a href="https://beacio.com/" target="_blank" rel="noopener noreferrer">Guide de configuration</a></div><button type="button" class="secondary" id="bleCapabilityCheck">Tester la compatibilité Bluetooth</button><small id="bleCapabilityResult" aria-live="polite"></small></div>';
  }
  function bleCapabilityRefresh(){
    const c=bleCapabilities(),x=document.getElementById("bleCapabilityText"),help=document.getElementById("bleInstallHelp");
    if(x)x.textContent=bleCapabilityText();if(help)help.hidden=!c.ios||c.available;
  }
  async function bleCapabilityCheck(){
    const out=document.getElementById("bleCapabilityResult");if(out)out.textContent="Vérification…";
    if(!bleAvailable())await new Promise(resolve=>setTimeout(resolve,2000));
    bleCapabilityRefresh();const c=bleCapabilities();let msg=bleCapabilityText();
    if(c.available&&typeof navigator.bluetooth.getAvailability==="function"){
      try{const ok=await navigator.bluetooth.getAvailability();msg+=ok?" · disponibilité signalée par le navigateur.":" · disponibilité non signalée : vérifier le Bluetooth et les permissions.";}catch{msg+=" · état radio non vérifiable.";}
    }
    if(c.available)msg+=" · connecter un capteur pour vérifier la réception réelle.";
    if(c.background)msg+=" · API arrière-plan détectée, fonctionnement à vérifier.";
    if(out)out.textContent=msg;
  }
  function bleTextStatus(){
    return bleCapabilityText();
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
    return chooseSensorMetric(metric,(globalThis.resurgoLiveSensors?.[metric]||[]).filter(s=>bleSourceEnabled[s.sourceType]!==false),Date.now());
  }
  function bleHrSnapshot(){
    const reading=bleMetric("heartRate");
    return {available:reading.available,bpm:reading.available?reading.value:null,
      source:reading.available?reading.source:null,
      device:[...bleHeartLinks.values()].find(x=>x.id===reading.deviceId)?.device?.name||null,deviceId:reading.deviceId||null,
      status:bleHrState};
  }
  function bleMachineSnapshot(){
    const fresh=bleSourceEnabled.fitness_machine!==false&&bleMachineState==="live"&&bleReadingIsFresh(bleMachineReading);
    const d=fresh?bleMachineReading:null;
    const progressive=Boolean(d&&(Number.isFinite(d.distanceM)||Number.isFinite(d.speedKmh)));
    return {connected:bleMachineLink?.device?.gatt?.connected||false,
      available:progressive,kind:bleMachineKind,state:fresh?"live":bleMachineState==="live"?"stale":bleMachineState,
      speedKmh:progressive?d.speedKmh??null:null,distanceM:progressive?d.distanceM??null:null,
      cadenceRpm:d?.cadenceRpm??null,powerW:d?.powerW??null,protocol:bleMachineProtocol,device:bleMachineLink?.device?.name||null};
  }
  function bleStatusRefresh(){
    bleBackgroundStatus();bleCapabilityRefresh();
    const st=document.getElementById("bleDeviceStatus");
    const hr=bleHrSnapshot(),m=bleMachineSnapshot();
    if(st)st.textContent=bleTextStatus()+" Cardio : "+(hr.available?hr.bpm+" bpm ("+hr.source+")":"aucune mesure fraîche")+
      ". Machine : "+(m.available?m.kind+" / "+(m.distanceM!==null?m.distanceM+" m":m.speedKmh+" km/h"):
        (m.connected?"connectée, données de progression absentes/périmées":"non connectée"))+".";
    const diagnostic=document.getElementById("bleBikeDiagnostic");
    if(diagnostic)diagnostic.textContent=JSON.stringify({protocol:m.protocol,device:m.device||bleMachineSelected,state:m.state,trace:bleMachineTrace,speedKmh:m.speedKmh,distanceM:m.distanceM,cadenceRpm:m.cadenceRpm,powerW:m.powerW,heartRate:hr.bpm,heartSource:hr.source},null,2);
    for(const [id,value,unit] of [["liveCadence",m.cadenceRpm," rpm"],["livePower",m.powerW," W"]]){const field=document.getElementById(id);if(field)field.textContent=Number.isFinite(value)?Math.round(value)+unit:"—";}
    const hc=document.getElementById("liveHeartRate");
    if(hc)hc.textContent=hr.available?hr.bpm+" bpm":"—";
    for(const role of ["watch","chest_strap","fitness_machine"]){const field=document.getElementById("sourceStatus_"+role);if(!field)continue;const names=role==="fitness_machine"?(m.connected?[m.device||"Machine"]:[]):[...bleHeartLinks.values()].filter(x=>x.role===role).map(x=>x.device.name||"Capteur");field.textContent=bleSourceEnabled[role]===false?"Désactivée":names.length?names.join(", "):"Non connectée";}
    const hp=document.getElementById("liveHeartSource");if(hp)hp.textContent=hr.available?(hr.device||hr.source):"Aucune mesure";
    const ms=document.getElementById("liveMachineStatus");
    if(ms)ms.textContent=m.available?
      (m.device||"Machine")+" · mesures reçues":m.connected?"Machine : attente de mesures":"Machine facultative";
  }
  async function bleHrDisconnect(role=null){
    for(const [id,link] of [...bleHeartLinks]){
      if(role&&link.role!==role)continue;
      try{link.characteristic.removeEventListener("characteristicvaluechanged",link.handler);}catch{}
      try{link.device.removeEventListener("gattserverdisconnected",link.lost);}catch{}
      try{link.device.gatt.disconnect();}catch{}
      bleForgetDevice(id);bleHeartLinks.delete(id);bleBackgroundRelease(id);
    }
    bleHrLink=null;bleHrReading=null;bleHrState=bleHeartLinks.size?"connected":"unavailable";bleStatusRefresh();
  }
  async function bleHrConnect(role=null){
    if(!bleAvailable()){alert(bleTextStatus());return;}
    const selected=typeof role==="string"?role:document.getElementById("bleHrSourceType")?.value||"chest_strap";
    try{
      // Request directly in user gesture, without disconnecting existing sensors.
      const device=await navigator.bluetooth.requestDevice({filters:[{services:[BLE_HR]}]});
      const kind=typeof role==="string"?role:/enduro|fenix|forerunner|watch|vivoactive|venu/i.test(device.name||"")?"watch":selected;
      const id=device.id||device.name||kind;
      if(bleHeartLinks.has(id)){bleSourceEnabled[kind]=true;bleStatusRefresh();return;}
      const server=await device.gatt.connect(),service=await server.getPrimaryService(BLE_HR),characteristic=await service.getCharacteristic(BLE_HR_MEAS);
      const lost=()=>{bleForgetDevice(id);bleHeartLinks.delete(id);bleStatusRefresh();};
      const handler=event=>{try{const data=bleHeartPacket(event.target.value);bleIngestMetric("heartRate",data.heartRate,kind,id);bleStatusRefresh();}catch{}};
      const link={id,device,characteristic,role:kind,handler,lost};
      bleHeartLinks.set(id,link);bleSourceEnabled[kind]=true;
      device.addEventListener("gattserverdisconnected",lost);characteristic.addEventListener("characteristicvaluechanged",handler);
      try{await characteristic.startNotifications();}catch(err){lost();try{device.gatt.disconnect();}catch{}throw err;}
      bleHrState="connected";bleStatusRefresh();bleBackgroundKeep(device);
    }catch(e){if(e?.name!=="NotFoundError")alert("Cardio BLE : "+bleErrorText(e));}
  }
  async function bleMachineDisconnect(){
    for(const link of bleBikeLinks){try{link.characteristic.removeEventListener("characteristicvaluechanged",link.handler);}catch{}}
    bleBikeLinks=[];bleBikePrevious={};bleBikeMetrics={};bleMachineProtocol="FTMS";
    if(bleMachineLink){
      bleForgetDevice(bleMachineLink.device.id||"pm5");bleBackgroundRelease(bleMachineLink.device.id);
      try{bleMachineLink.characteristic.removeEventListener("characteristicvaluechanged",bleMachineNotify);}catch{}
      try{bleMachineLink.device.removeEventListener("gattserverdisconnected",bleMachineLost);}catch{}
      try{bleMachineLink.device.gatt?.disconnect();}catch{}
    }
    bleMachineLink=null;bleMachineReading=null;bleMachineKind=null;bleMachineState="unavailable";
    bleStatusRefresh();
  }
  function bleMachineLost(){bleForgetDevice(bleMachineLink?.device?.id);bleMachineState="lost";bleMachineReading=null;bleStatusRefresh();}
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
  async function bleMachineConnect(mode="standard",requestedKind=null){
    if(!bleAvailable()){alert(bleTextStatus());return;}
    const universal=mode==="universal",nativeMode=["pm5","pm5scan","pm5data"].includes(mode),cyclingMode=["csc","cps"].includes(mode);
    const kind=nativeMode||cyclingMode?"bike":requestedKind||document.getElementById("bleMachineKind")?.value||"bike";
    if(!FTMS_CHARACTERISTICS[kind]){alert("Sélectionner un type d'appareil valide.");return;}
    bleMachineDisconnect();
    bleSourceEnabled.fitness_machine=true;
    bleMachineTrace=[];bleMachineSelected=null;
    bleMachineState="connecting";bleStatusRefresh();
    let stage="sélection de l'appareil";
    try{
      // Bluefy field test: one service filter opens the picker, mixed name/service filters do not.
      // PM5 direct button uses the proprietary data service; standard bike uses the same
      // single FTMS filter as treadmill and elliptical, with other services authorized.
      const options=universal?{acceptAllDevices:true,optionalServices:[BLE_FTMS,PM5_DATA,BLE_CSC,BLE_POWER]}:mode==="pm5"?{filters:[{services:[PM5_DISCOVERY]}],optionalServices:[PM5_DATA]}:
        mode==="pm5scan"?{acceptAllDevices:true,optionalServices:[PM5_DATA]}:
        mode==="pm5data"?{filters:[{services:[PM5_DATA]}]}:
        cyclingMode?{filters:[{services:[mode==="csc"?BLE_CSC:BLE_POWER]}]}:
        {filters:[{services:[BLE_FTMS]}]};
      bleTrace("Recherche "+mode+" : "+JSON.stringify(options));
      const device=await navigator.bluetooth.requestDevice(options);
      bleMachineSelected=device.name||"Appareil sans nom";
      bleTrace("Appareil : "+bleMachineSelected);
      stage="connexion GATT";
      const server=await device.gatt.connect();
      bleMachineLink={device,characteristic:null};bleMachineKind=kind;
      device.addEventListener("gattserverdisconnected",bleMachineLost);
      bleTrace("GATT connecté");
      const isPm5=nativeMode||/PM5|Concept2|BikeErg/i.test(device.name||"");
      let connected=false;
      if(!nativeMode&&!cyclingMode&&!(universal&&isPm5&&kind==="bike")){
        stage="FTMS "+FTMS_CHARACTERISTICS[kind].toString(16);
        try{
          const service=await server.getPrimaryService(BLE_FTMS);
          const characteristic=await service.getCharacteristic(FTMS_CHARACTERISTICS[kind]);
          bleMachineLink.characteristic=characteristic;
          characteristic.addEventListener("characteristicvaluechanged",bleMachineNotify);
          await characteristic.startNotifications();connected=true;bleTrace("FTMS notifications OK");
        }catch(error){bleTrace(stage+" : "+bleErrorText(error));try{bleMachineLink.characteristic?.removeEventListener("characteristicvaluechanged",bleMachineNotify);}catch{}bleMachineLink.characteristic=null;if(!universal||!isPm5||kind!=="bike")throw error;}
      }
      if(!connected&&kind==="bike"&&isPm5&&(nativeMode||universal)){
        stage="Concept2 natif";bleMachineProtocol="PM5 natif";
        let progress=false;
        for(const id of [0x31,0x32,0x36]){
          try{await bleSubscribeBike(server,PM5_DATA,pm5Uuid(id),event=>blePm5Notify(event,id));if(id===0x31||id===0x32)progress=true;}
          catch(error){bleTrace("PM5 "+id.toString(16)+" : "+bleErrorText(error));}
        }
        connected=progress;
        if(!connected&&universal){try{const service=await server.getPrimaryService(BLE_FTMS);const characteristic=await service.getCharacteristic(FTMS_CHARACTERISTICS[kind]);bleMachineLink.characteristic=characteristic;characteristic.addEventListener("characteristicvaluechanged",bleMachineNotify);await characteristic.startNotifications();bleMachineProtocol="FTMS";connected=true;}catch(error){bleTrace("FTMS secours : "+bleErrorText(error));}}

      }
      if(cyclingMode){stage=mode.toUpperCase();bleMachineProtocol="PM5 "+stage;await bleSubscribeBike(server,mode==="csc"?BLE_CSC:BLE_POWER,mode==="csc"?BLE_CSC_MEAS:BLE_POWER_MEAS,event=>bleBikeNotify(event,mode.toUpperCase()));connected=true;}
      if(!connected)throw Error("Aucun service de mesure compatible");
      if(bleMachineState!=="live")bleMachineState="connected";bleStatusRefresh();bleBackgroundKeep(device);
    }catch(e){bleTrace(stage+" : "+bleErrorText(e));await bleMachineDisconnect();bleMachineState="unavailable";bleStatusRefresh();if(e?.name!=="NotFoundError")
      alert("Machine BLE — "+stage+" : "+(String(e)==="2"?"Le navigateur a annulé ou refusé la sélection (code 2).":bleErrorText(e))+" Ouvrir Diagnostic vélo. Essayer une autre méthode de recherche PM5.");}
  }

  function bluefyHelpPanel(){
    const appUrl=location.href.split("#")[0].split("?")[0];
    return `${sourceManager(true)}<details class="panel" id="bleHelp">
      <summary>ⓘ Bluetooth sur iPhone — Safari + beacio</summary>
      <p>Installe l’extension gratuite <a href="https://apps.apple.com/fr/app/beacio/id6761301368" target="_blank" rel="noopener noreferrer">beacio (App Store)</a>, active-la dans Réglages → Apps → Safari → Extensions et autorise ce site. Ouvre ResurGo dans un onglet Safari, pas dans la PWA autonome. Sur Android, Chrome suffit.</p>
      <p>Adresse : <code id="bleHelpUrl">${esc(appUrl)}</code> <button type="button" class="secondary" id="copyBleUrl">Copier l’adresse</button></p>
      <p><strong>Apple Watch :</strong> la diffusion cardio BLE standard nécessite une app dédiée. Sur watchOS 26 ou ultérieur, essayer <a href="https://apps.apple.com/fr/app/hearttx-heart-rate-broadcast/id6825348767" target="_blank" rel="noopener noreferrer">HeartTX (gratuit)</a> directement sur la montre, puis connecter la source Montre dans ResurGo. Compatibilité réelle à vérifier. Garmin et les autres capteurs BLE standards restent compatibles.</p><p>Les profils Safari et PWA autonome peuvent être distincts. Sauvegarde ou synchronise via NAS avant de changer. Le maintien BLE beacio ne garantit pas l’enregistrement des échantillons ni le GPS pendant la suspension de Safari.</p>
      
    </details>
    <details class="bleAdvanced"><summary>Diagnostic avancé / autre machine</summary><div class="grid two">
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
      <button type="button" class="secondary" id="blePm5Connect">Concept2 PM5 — recherche native</button>
      <button type="button" class="secondary" id="blePm5Scan">Concept2 PM5 — recherche tous appareils</button>
      <button type="button" class="secondary" id="blePm5Data">Concept2 PM5 — filtre données</button>
      <button type="button" class="secondary" id="bleCscConnect">PM5 — vitesse/cadence CSC</button>
      <button type="button" class="secondary" id="bleCpsConnect">PM5 — puissance CPS</button>
      <button type="button" class="secondary" id="bleMachineDisconnect">Déconnecter machine</button>
    </div>
    <p id="bleDeviceStatus" role="status" aria-live="polite">${esc(bleTextStatus())}</p><details><summary>Diagnostic vélo (copier le texte)</summary><pre id="bleBikeDiagnostic" style="white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;max-width:100%;font-size:12px;user-select:text">En attente de connexion</pre><button type="button" class="secondary" id="copyBleDiagnostic">Copier le diagnostic</button></details></details>`;
  }
  async function copyBleDiagnostic(){
    const field=document.getElementById("bleBikeDiagnostic");
    if(!field)return;
    try{await navigator.clipboard.writeText(field.textContent);alert("Diagnostic copié.");}
    catch{try{const range=document.createRange();range.selectNodeContents(field);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}catch{}}
  }
  async function bluefyCopyAddress(){
    const address=location.href.split("#")[0].split("?")[0];
    try{await navigator.clipboard.writeText(address);alert("Adresse HTTPS de ResurGo copiée. Colle-la dans Safari.");}
    catch{const e=document.getElementById("bleHelpUrl");if(e){const range=document.createRange();range.selectNodeContents(e);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}alert("Sélectionne et copie l'adresse ResurGo affichée, puis colle-la dans Safari.");}
  }

  function sourceMachineKind(){return (typeof liveSelectedMachine==="function"?liveSelectedMachine():null)||document.getElementById("liveIndoorKind")?.value||"bike";}
  function bleConnectForSession(){const k=sourceMachineKind();return bleMachineConnect(navigator.beacio?"universal":k==="bike"?"pm5":"standard",k);}
  function sourceRow(role,title,button){return '<div class="sourceRow"><label><input type="checkbox" data-source-toggle="'+role+'" '+(bleSourceEnabled[role]!==false?"checked":"")+'><span><strong>'+title+'</strong><small id="sourceStatus_'+role+'">Non connectée</small></span></label><button class="secondary" id="'+button+'">Connecter</button></div>';}
  function sourceManager(includeMachine=true){return '<div class="sourceManager"><h3>Sources de données</h3>'+bleCapabilityPanel()+(includeMachine?sourceRow("fitness_machine","Machine de sport","liveConnectMachine"):"")+sourceRow("watch","Montre · cardio","liveConnectWatch")+sourceRow("chest_strap","Ceinture cardio","liveConnectStrap")+'<div class="sourceRow"><span>Chronomètre</span><small>Toujours actif</small></div><p class="muted">Sources facultatives. La meilleure mesure fraîche est retenue automatiquement.</p><small id="bleBackgroundStatus"></small></div>';}

  const bleBackgroundHandles=new Map(),bleBackgroundPending=new Map();
  let bleBackgroundGeneration=0,bleBackgroundError="";
  function bleBackgroundStatus(){const x=document.getElementById("bleBackgroundStatus");if(x)x.textContent=!navigator.beacio?.backgroundSync?"Arrière-plan BLE : indisponible":bleBackgroundError?"Arrière-plan BLE : "+bleBackgroundError:"Arrière-plan BLE : "+bleBackgroundHandles.size+" connexion(s) maintenue(s) · enregistrement continu non garanti";}
  async function bleBackgroundKeep(device){
    const api=navigator.beacio?.backgroundSync,id=device?.id;
    if(!id||!api?.requestBackgroundConnection||typeof state==="undefined"||!state.liveSession||bleBackgroundHandles.has(id)||bleBackgroundPending.has(id))return;
    const generation=bleBackgroundGeneration,token={};bleBackgroundPending.set(id,token);
    try{const handle=await api.requestBackgroundConnection({deviceId:id});
      if(generation!==bleBackgroundGeneration||bleBackgroundPending.get(id)!==token||!state.liveSession){if(handle?.unregister)await handle.unregister();else if(handle?.id)await api.unregister(handle.id);return;}
      if(handle?.id||handle?.unregister)bleBackgroundHandles.set(id,handle);bleBackgroundError="";
    }catch(e){bleBackgroundError=bleErrorText(e);}finally{if(bleBackgroundPending.get(id)===token)bleBackgroundPending.delete(id);bleBackgroundStatus();}
  }
  function bleBackgroundStart(){for(const link of bleHeartLinks.values())if(bleSourceEnabled[link.role]!==false)bleBackgroundKeep(link.device);if(bleSourceEnabled.fitness_machine!==false&&bleMachineLink)bleBackgroundKeep(bleMachineLink.device);}
  async function bleBackgroundRelease(id){bleBackgroundPending.delete(id);const h=bleBackgroundHandles.get(id);bleBackgroundHandles.delete(id);try{if(h?.unregister)await h.unregister();else if(h?.id)await navigator.beacio?.backgroundSync?.unregister(h.id);}catch(e){bleBackgroundError=bleErrorText(e);}bleBackgroundStatus();}
  function bleBackgroundStop(){bleBackgroundGeneration++;bleBackgroundPending.clear();for(const id of [...bleBackgroundHandles.keys()])bleBackgroundRelease(id);}
