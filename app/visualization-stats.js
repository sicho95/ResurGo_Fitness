  // Regrouper ici les helpers de visualisation, d'import/export,
  // de communication Worker et de cycle de vie PWA.
pull:["Posture haute","Tire les coudes vers l'arrière", {head:[172,74],neck:[172,96],mid:[172,136],hip:[172,170],lhand:[252,120],rhand:[252,120],lknee:[150,206],lfoot:[130,222],rknee:[194,206],rfoot:[218,222]}, {head:[172,74],neck:[172,96],mid:[172,136],hip:[172,170],lhand:[204,126],rhand:[210,126],lknee:[150,206],lfoot:[130,222],rknee:[194,206],rfoot:[218,222]}], cardio:["Foulée courte","Reste facile et régulier", {head:[142,76],neck:[142,98],mid:[132,136],hip:[122,166],lhand:[96,126],rhand:[178,124],lknee:[100,194],lfoot:[68,218],rknee:[154,190],rfoot:[202,206]}, {head:[260,76],neck:[260,98],mid:[250,136],hip:[240,166],lhand:[296,126],rhand:[218,124],lknee:[268,190],lfoot:[318,206],rknee:[218,194],rfoot:[184,218]}], mobility:["Amplitude douce","Bouge lentement sans forcer", {head:[166,66],neck:[166,88],mid:[166,130],hip:[166,168],lhand:[118,112],rhand:[214,112],lknee:[144,204],lfoot:[122,222],rknee:[188,204],rfoot:[214,222]}, {head:[250,66],neck:[250,88],mid:[238,130],hip:[226,168],lhand:[170,104],rhand:[318,82],lknee:[204,204],lfoot:[178,222],rknee:[250,204],rfoot:[278,222]}]}; if(map[x.id]) return map[x.id]; if(["front_plank","side_plank_knees"].includes(x.id)) return map.plank; if(x.family==="push") return map.push; if(x.family==="pull") return map.pull; if(["glute_bridge"].includes(x.id)) return map.bridge; if(x.family==="legs") return map.squat; if(x.family==="cardio") return map.cardio; if(x.family==="knee_rehab") return map.mobility; if(x.family==="mobility"||x.family==="warmup"||x.family==="cooldown") return map.mobility; return map.mobility; }
  function legacyPoseDiagram(x){ const [a,b,start,end]=poseTemplate(x), c={core:"#4f9cff",push:"#f57b45",pull:"#7c6cff",legs:"#5dbb63",knee_rehab:"#19a974",mobility:"#b9f66b",cardio:"#ff5c7a",warmup:"#49c6b7",cooldown:"#9aa5a1"}[x.family]||"#4f9cff"; return `<svg class="exoSvg poseSvg" viewBox="0 0 420 250" role="img" aria-label="${esc(x.name)}"><rect width="420" height="250" rx="20" fill="#eef5ef"/><text x="22" y="31" font-size="18" font-family="Arial" font-weight="800" fill="#12231f">${esc(x.name)}</text><path d="M42 222h336" stroke="#d1dfd5" stroke-width="8" stroke-linecap="round"/><g class="poseStart">${poseLine(start,"",.22)}</g><g class="poseMove">${poseLine(end)}</g><path d="M112 52 C170 28 247 28 306 52" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/><path d="M296 42 l22 11 l-22 11" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><text x="34" y="236" fill="#62716b" font-size="13">${esc(a)}</text><text x="212" y="236" fill="#62716b" font-size="13">${esc(b)}</text></svg>`; }
  function bodyPartIds(x){ const byId={quad_set:["quads","knees"],straight_leg_raise:["quads","hips","knees"],seated_knee_extension:["quads","knees"],standing_hamstring_curl:["hamstrings","hips","knees"],clamshell:["glutes","hips","knees"],hip_abduction_side:["glutes","hips","knees"]}; if(byId[x.id]) return byId[x.id]; const t=targets(x).join(" ").toLowerCase(), has=s=>t.includes(s), ids=new Set(); if(has("abdos")||has("oblique")||has("respiration")) ["abdominals","obliques"].forEach(i=>ids.add(i)); if(has("pectoraux")) ids.add("chest"); if(has("épaule")||has("arrière épaules")) ["front-shoulders","rear-shoulders","shoulders","traps"].forEach(i=>ids.add(i)); if(has("dos")||has("dorsal")||has("haut du dos")) ["lats","traps","traps-middle","lowerback","rear-shoulders"].forEach(i=>ids.add(i)); if(has("lombaire")) ["lowerback","lats"].forEach(i=>ids.add(i)); if(has("fessier")||has("hanche")||has("psoas")||has("stabilisateurs de hanche")||has("articulation de hanche")) ["hips","glutes"].forEach(i=>ids.add(i)); if(has("cuisse")||has("ischios")||has("jambes")||has("quadriceps")) ["quads","hamstrings"].forEach(i=>ids.add(i)); if(has("genou")||has("rotule")) ids.add("knees"); if(has("mollet")||has("cheville")) ["calves","ankles"].forEach(i=>ids.add(i)); if(has("bras")||has("biceps")) ids.add("biceps"); if(has("triceps")) ids.add("triceps"); if(has("cardio")||has("coeur")) ["quads","calves","hamstrings"].forEach(i=>ids.add(i)); return [...ids]; }
  function injectedBodyMap(kind, ids, label){ let svg=bodyMapSvg[kind]||""; if(!svg) return `<img class="anatomyMap detailedBodyMap anatomyModel" src="${bodyMapAssets[kind]}" alt="${esc(label)}">`; svg=svg.replace(/<svg\b([^>]*)>/,(m,attrs)=>{ const cleaned=attrs.replace(/\sclass="[^"]*"/,"").replace(/\srole="[^"]*"/,"").replace(/\saria-label="[^"]*"/,""); return `<svg${cleaned} class="anatomyMap detailedBodyMap anatomyModel" role="img" aria-label="${esc(label)}">`; }); ids.forEach(id=>{ svg=svg.replace(new RegExp(`(<[^>]*\\bid="${id}"[^>]*\\bclass=")([^"]*)(")`,`g`),`$1hot $2$3`); svg=svg.replace(new RegExp(`(<[^>]*\\bclass=")([^"]*)("[^>]*\\bid="${id}"[^>]*>)`,`g`),`$1hot $2$3`); }); return svg; }
  function muscleMap(x){ const kind=profile()?.gender==="female"?"female":"male"; return injectedBodyMap(kind,bodyPartIds(x),`Zones travaillées ${x.name}`); }
  function chartTime(r){ return timeValue(r?.measuredAt||r?.startedAt||r?.date||r?.createdAt||TODAY); }
  function weekNo(d){ const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())), day=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()+4-day); const start=new Date(Date.UTC(x.getUTCFullYear(),0,1)); return Math.ceil((((x-start)/86400000)+1)/7); }
  function chartDateLabel(value,spanDays){ const d=new Date(value); if(spanDays>730) return String(d.getFullYear()); if(spanDays>120) return d.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"}); if(spanDays>35) return `S${weekNo(d)}`; return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}); }
  function chartTickIndexes(rows,count=5){ if(rows.length<=1) return [0]; const max=Math.min(count,rows.length), out=[]; for(let i=0;i<max;i++) out.push(Math.round(i*(rows.length-1)/(max-1))); return [...new Set(out)]; }
  function chartNiceStep(range, target=4){ const raw=Math.max(range,Number.EPSILON)/Math.max(1,target), pow=10**Math.floor(Math.log10(raw)), scaled=raw/pow, nice=scaled<=1?1:scaled<=2?2:scaled<=5?5:10; return nice*pow; }
  function chartTicks(min,max,target=4){ if(min===max){ const step=chartNiceStep(Math.max(1,Math.abs(min)*.02),target), base=Math.floor(min/step)*step; return {ticks:[base,base+step,base+step*2],minY:base,maxY:base+step*2,step}; } const step=chartNiceStep(max-min,target), minY=Math.floor(min/step)*step, maxY=Math.ceil(max/step)*step, ticks=[]; for(let v=minY,i=0; v<=maxY+step/2&&i<8; v+=step,i++) ticks.push(Number(v.toPrecision(12))); return {ticks,minY,maxY,step}; }
  function chartFormatValue(v,step){ const decimals=step<1?Math.min(3,Math.ceil(-Math.log10(step))):0; return Number(v.toFixed(decimals)).toLocaleString("fr-FR",{minimumFractionDigits:decimals,maximumFractionDigits:decimals}); }
  function chartUnit(a,b,opts){ if(opts.unit!=null) return opts.unit; const ua=metricUnits?.[a]||"", ub=b?metricUnits?.[b]||"":ua; return ua===ub?ua.trim():""; }
  function chart(rows,a,b,target=null,large=false,opts={}){
    if(!rows.length) return "<p class='muted'>Aucune donnée.</p>";
    const series=[a,b].filter(Boolean), vals=rows.flatMap(r=>series.map(k=>metricValue(r,k))).filter(v=>v!=null), rawTarget=target==null||target===""?null:Number(target), targetValue=Number.isFinite(rawTarget)&&rawTarget>0?rawTarget:null;
    if(targetValue!=null) vals.push(targetValue);
    if(!vals.length) return "<p class='muted'>Aucune donnée.</p>";
    const min=Math.min(...vals), max=Math.max(...vals), pad=min===max?Math.max(.1,Math.abs(min)*.002):(max-min)*.08, scale=chartTicks(Math.max(0,min-pad),max+pad,4), minY=scale.minY, maxY=scale.maxY, W=large?820:520,H=large?470:190, plot=large?{l:54,r:18,t:24,b:32}:{l:62,r:24,t:38,b:46}, innerW=W-plot.l-plot.r, innerH=H-plot.t-plot.b;
    const x=i=>rows.length>1?plot.l+i*innerW/(rows.length-1):plot.l+innerW/2, y=v=>H-plot.b-((v-minY)/Math.max(1,maxY-minY)*innerH), pts=k=>rows.map((r,i)=>metricValue(r,k)!=null?`${x(i)},${y(metricValue(r,k))}`:null).filter(Boolean).join(" "), points=(k,color)=>rows.map((r,i)=>metricValue(r,k)!=null?`<circle class="chartPoint" data-point-index="${i}" cx="${x(i)}" cy="${y(metricValue(r,k))}" r="5" fill="${color}"><title>${esc(chartPointLabel(r,k))}</title></circle>`:"").join("");
    const times=rows.map(chartTime).filter(Boolean), spanDays=times.length>1?(Math.max(...times)-Math.min(...times))/86400000:0, yTicks=scale.ticks, xTicks=chartTickIndexes(rows,large?6:4), targetY=targetValue!=null?y(targetValue):null, unit=chartUnit(a,b,opts), legend=opts.legend||(b?"bleu poids · orange secondaire":(a==="waistCm"?"tour de ventre":"poids")), primaryColor=opts.primaryColor||"var(--blue)", secondaryColor=opts.secondaryColor||"var(--orange)", targetLabel=opts.targetLabel||`cible ${targetValue} kg`, key=opts.key||"", total=Number(opts.total)||rows.length;
    const yAxis=yTicks.map(v=>`<line x1="${plot.l}" y1="${y(v)}" x2="${W-plot.r}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${plot.l-8}" y="${y(v)+4}" text-anchor="end" fill="var(--muted)" font-size="12">${chartFormatValue(v,scale.step)}</text>`).join("");
    const xAxis=xTicks.map(i=>`<text x="${x(i)}" y="${H-18}" text-anchor="middle" fill="var(--muted)" font-size="12">${esc(chartDateLabel(chartTime(rows[i]),spanDays))}</text>`).join("");
    return `<svg class="chart ${large?"chartLarge":""}" viewBox="0 0 ${W} ${H}" data-interactive-chart="${key?1:0}" data-chart-key="${esc(key)}" data-chart-total="${total}"><rect width="${W}" height="${H}" rx="12" fill="var(--chart-bg)"/>${yAxis}<line x1="${plot.l}" y1="${plot.t}" x2="${plot.l}" y2="${H-plot.b}" stroke="var(--line)" stroke-width="1.5"/><line x1="${plot.l}" y1="${H-plot.b}" x2="${W-plot.r}" y2="${H-plot.b}" stroke="var(--line)" stroke-width="1.5"/>${xAxis}<text x="${plot.l}" y="24" fill="var(--muted)" font-size="12">${esc(unit||legend)}</text>${targetY!=null?`<line x1="${plot.l}" y1="${targetY}" x2="${W-plot.r}" y2="${targetY}" stroke="var(--green)" stroke-width="3" stroke-dasharray="8 8"/><text x="${W-plot.r-8}" y="${Math.max(20,targetY-8)}" text-anchor="end" fill="var(--green)">${esc(targetLabel)}</text>`:""}<polyline points="${pts(a)}" fill="none" stroke="${primaryColor}" stroke-width="4"/>${b?`<polyline points="${pts(b)}" fill="none" stroke="${secondaryColor}" stroke-width="4"/>`:""}${points(a,primaryColor)}${b?points(b,secondaryColor):""}<text class="chartReadout" x="${W-plot.r}" y="24" text-anchor="end" fill="var(--ink)">${esc(rows.length?chartPointLabel(rows[rows.length-1],a):"")}</text></svg>`;
  }
  function bar(rows){ if(!rows.length) return "<p class='muted'>Aucune activité.</p>"; const max=Math.max(...rows.map(r=>r.value),1); return `<div class="bars">${rows.map(r=>`<div><span style="height:${Math.max(8,r.value/max*120)}px"></span><small>${esc(r.label)}</small></div>`).join("")}</div>`; }
  function dateInputIso(id){ const raw=(el(id)?.value||TODAY).slice(0,10); return `${raw}T12:00:00.000Z`; }
  function datedInputIso(id){ const raw=(el(id)?.value||TODAY).slice(0,10); return raw>TODAY ? null : `${raw}T12:00:00.000Z`; }
  function datedRawValue(id){ const raw=(el(id)?.value||TODAY).slice(0,10); return raw>TODAY ? null : raw; }
  const metricFields=["weightKg","waistCm","bodyFatPct","waterPct","bmi","boneKg","muscleKg"], metricLabels={weightKg:"Poids",waistCm:"Tour de ventre",bodyFatPct:"Graisse",waterPct:"Eau",bmi:"IMC",boneKg:"Masse osseuse",muscleKg:"Masse musculaire",value:"Valeur",hrAvg:"FC moyenne",hrMax:"FC max"}, metricUnits={weightKg:" kg",waistCm:" cm",bodyFatPct:" %",waterPct:" %",bmi:"",boneKg:" kg",muscleKg:" kg",value:"",hrAvg:" bpm",hrMax:" bpm"};
  function metricValue(r,key){ const raw=r?.[key]; if(raw==null||raw==="") return null; const v=Number(raw); return Number.isFinite(v)&&v>0?v:null; }
  function metricFilledKeys(r,keys=metricFields){ return keys.filter(k=>metricValue(r,k)!=null); }
  function metricToken(id,key){ return `${id}__${key}`; }
  function parseMetricToken(token){ const i=String(token||"").lastIndexOf("__"); return i>0?{id:String(token).slice(0,i),key:String(token).slice(i+2)}:{id:token,key:"weightKg"}; }
  function chartPointLabel(r,key){ const label=metricLabels[key]||"", unit=metricUnits[key]||"", value=metricValue(r,key), when=new Date(r.measuredAt||r.startedAt||TODAY).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"}); return value==null?when:`${when} · ${label} ${value}${unit}`; }
  function profileStartMetricPoint(p){
    const startWeight=Number(p?.startWeightKg);
    return Number.isFinite(startWeight)&&startWeight>0 ? {
      id:metricToken("profile_start","weightKg"),
      recordId:"profile_start",
      profileId:p.id,
      source:"profile",
      measuredAt:p.createdAt||`${TODAY}T12:00:00.000Z`,
      metricKey:"weightKg",
      metricLabel:"Poids",
      metricUnit:metricUnits.weightKg||"",
      metricDisplayValue:startWeight,
      weightKg:startWeight
    } : null;
  }
  function metricRowsFor(p,key,{includeProfileStart=false}={}){ const rows=state.metrics.filter(x=>x.profileId===p.id&&metricValue(x,key)!=null).sort((a,b)=>metricTime(a)-metricTime(b)); if(includeProfileStart&&key==="weightKg"){ const startWeight=Number(p.startWeightKg); if(Number.isFinite(startWeight)&&startWeight>0) rows.unshift({id:"profile_start",profileId:p.id,source:"profile",measuredAt:p.createdAt||`${TODAY}T12:00:00.000Z`,weightKg:startWeight}); } return rows.sort((a,b)=>metricTime(a)-metricTime(b)); }
  function metricRowsForAny(p,keys){ return state.metrics.filter(x=>x.profileId===p.id&&metricFilledKeys(x,keys).length).sort((a,b)=>metricTime(a)-metricTime(b)); }
  function metricPointRows(p,keys,{includeProfileStart=false}={}){ const rows=state.metrics.filter(x=>x.profileId===p.id).flatMap(r=>metricFilledKeys(r,keys).map(key=>({...r,id:metricToken(r.id,key),recordId:r.id,metricKey:key,metricLabel:metricLabels[key],metricUnit:metricUnits[key]||"",metricDisplayValue:metricValue(r,key)}))); if(includeProfileStart&&keys.includes("weightKg")){ const start=profileStartMetricPoint(p); if(start) rows.push(start); } return rows.sort((a,b)=>metricTime(a)-metricTime(b)); }
  function metricTimelineRows(p,key="weightKg"){ return metricRowsFor(p,key,{includeProfileStart:key==="weightKg"}); }
  function beginRecordEdit(kind,id){ state.ui.recordEdit={kind,id}; render(); }
  function cancelRecordEdit(){ state.ui.recordEdit=null; render(); }
  function deleteMetricRecord(token){
    const {id,key}=parseMetricToken(token);
    if(id==="profile_start"){
      const p=profile(); if(!p) return;
      if(!confirm("Tu es sur le point de supprimer le poids initial saisi dans le profil. Veux-tu continuer ?")) return;
      if(!confirm("Confirmation finale : supprimer ce poids initial du profil ? Il faudra en ressaisir un dans les paramètres du profil pour une génération de plan cohérente.")) return;
      p.startWeightKg=null;
      state.ui.recordEdit=null;
      save("Poids initial du profil supprimé. Pense à en ressaisir un dans le profil.").then(render);
      return;
    }
    const item=state.metrics.find(x=>x.id===id); if(!item) return;
    if(!confirm("Supprimer ce point de mesure local ?")) return;
    if(metricFilledKeys(item).length<=1) state.metrics=state.metrics.filter(x=>x.id!==id); else item[key]=null;
    state.ui.recordEdit=null;
    save("Point supprimé.").then(render);
  }
  function deleteActivityRecord(id){
    const item=state.activities.find(x=>x.id===id); if(!item) return;
    if(!confirm("Supprimer cette activité locale ?")) return;
    state.activities=state.activities.filter(x=>x.id!==id);
    if(item.profileId) refreshPlanAfterActivity(item.profileId);
    state.ui.recordEdit=null;
    save("Activité supprimée.").then(render);
  }
  function saveMetricRecord(token){
    const {id,key}=parseMetricToken(token);
    const nextValue=num(`editMetricValue_${token}`);
    if(nextValue==null){ save("Mesure incomplète : renseigne une valeur.").then(render); return; }
    if(id==="profile_start"){
      const p=profile(); if(!p) return;
      p.startWeightKg=nextValue;
      state.ui.recordEdit=null;
      save("Poids initial du profil mis à jour.").then(render);
      return;
    }
    const item=state.metrics.find(x=>x.id===id); if(!item) return;
    const rawDate=datedRawValue(`editMetricDate_${token}`); if(!rawDate){ save("Date de mesure invalide : pas de saisie future.").then(render); return; }
    item.measuredAt=`${rawDate}T12:00:00.000Z`;
    item[key]=nextValue;
    item.metricKind=key;
    state.ui.recordEdit=null;
    save("Point mis à jour.").then(render);
  }
  function saveActivityRecord(id){
    const item=state.activities.find(x=>x.id===id); if(!item) return;
    const rawDate=datedRawValue(`editActivityDate_${id}`); if(!rawDate){ save("Date d'activité invalide : pas de saisie future.").then(render); return; }
    const nextDistance=num(`editActivityDistance_${id}`), nextDuration=num(`editActivityDuration_${id}`);
    if(!nextDistance&&!nextDuration){ save("Activité incomplète : renseigne au moins la distance ou la durée.").then(render); return; }
    item.startedAt=`${rawDate}T12:00:00.000Z`;
    item.type=el(`editActivityType_${id}`)?.value||item.type;
    item.distanceKm=nextDistance;
    item.durationSeconds=nextDuration?nextDuration*60:null;
    item.hrAvg=num(`editActivityHrAvg_${id}`);
    item.hrMax=num(`editActivityHrMax_${id}`);
    item.feeling=num(`editActivityFeeling_${id}`);
    item.pain=num(`editActivityPain_${id}`);
    if(item.profileId) refreshPlanAfterActivity(item.profileId);
    state.ui.recordEdit=null;
    save("Activité mise à jour.").then(render);
  }
  function addMetric(){ const p=profile(), measuredAt=datedInputIso("metricDate"); if(!p) return; const values=metricFields.map(key=>({key,value:num(key)})).filter(x=>x.value!=null); if(!values.length){ save("Mesure incomplète : renseigne au moins une donnée.").then(render); return; } if(!measuredAt){ save("Date de mesure invalide : pas de saisie future.").then(render); return; } values.forEach(({key,value})=>state.metrics.push({id:uid(`metric_${key}`),profileId:p.id,source:"manual",metricKind:key,measuredAt,[key]:value})); state.ui.modal=null; save(`${values.length} point${values.length>1?"s":""} enregistré${values.length>1?"s":""}.`).then(render); }
  function addRun(){ const p=profile(), startedAt=datedInputIso("runDate"), distance=num("runDistance"), duration=num("runDuration"); if(!p) return; if(!distance&&!duration){ save("Activité incomplète : renseigne au moins la distance ou la durée.").then(render); return; } if(!startedAt){ save("Date d'activité invalide : pas de saisie future.").then(render); return; } state.activities.push({id:uid("activity"),profileId:p.id,source:"manual",type:el("runType").value,startedAt,distanceKm:distance,durationSeconds:duration?duration*60:null,avgSpeedKmh:num("runPace"),hrAvg:num("runHrAvg"),hrMax:num("runHrMax"),feeling:num("runFeeling"),pain:num("runPain")}); refreshPlanAfterActivity(p.id); state.ui.modal=null; save("Activité enregistrée et plan recalculé.").then(render); }
  function exportJson(secret=false){ const c=clone(state); if(!secret)c.settings.workerToken=""; const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),...c},null,2)],{type:"application/json"})); a.download=`resurgo-export-${TODAY}.json`; a.click(); URL.revokeObjectURL(a.href); }
  async function importJson(file){ const p=JSON.parse(await file.text()); state={...clone(empty),...p,settings:{...empty.settings,...(p.settings||{})},ui:{...empty.ui,...(p.ui||{})}}; delete state.exportedAt; state.profiles.forEach(x=>refreshPlanAfterActivity(x.id)); await save("Import JSON terminé et plan recalculé."); render(); }
  async function worker(path,init={}){ const base=state.settings.workerUrl.replace(/\/$/,""); if(!base) throw new Error("URL Worker manquante."); const h={"content-type":"application/json",...(init.headers||{})}; if(state.settings.workerToken) h.authorization=`Bearer ${state.settings.workerToken}`; const r=await fetch(base+path,{...init,headers:h}), b=await r.json().catch(()=>({})); if(!r.ok) throw new Error(b.error||`Worker ${r.status}`); return b; }
  async function testWorker(){ try{ const r=await worker("/health"); state.ui.message=`Worker OK: ${r.service||"health"}`; }catch(e){ state.ui.message=`Worker erreur: ${e.message}`; } render(); }
  async function mockGarmin(){ try{ const p=profile(); const r=await worker("/v1/garmin/mock-sync",{method:"POST",body:JSON.stringify({profileId:p?.id})}); state.metrics.push(...(r.metrics||[])); state.activities.push(...(r.activities||[])); if(p) refreshPlanAfterActivity(p.id); await save("Mock Garmin importé et plan recalculé."); }catch(e){ state.ui.message=`Mock Garmin impossible: ${e.message}`; } render(); }
  async function installPwa(){ if(!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice.catch(()=>{}); deferredInstallPrompt=null; state.settings.hideInstallPrompt=true; save().then(render); }
  function applyHotUpdate(){ if(updateWaiting){ updateWaiting.postMessage({type:"SKIP_WAITING"}); return; } if(swRegistration?.waiting){ swRegistration.waiting.postMessage({type:"SKIP_WAITING"}); return; } if(swRegistration) swRegistration.update(); }
  async function checkOnlineVersion(){
    if(!navigator.onLine) return;
    try{
      const r=await fetch(`./version.json?ts=${Date.now()}`,{cache:"no-store"});
      const v=await r.json();
      remoteVersion=v.version||APP_VERSION;
      remoteBuild=v.buildId||remoteVersion;
      if(remoteBuild!==APP_BUILD||remoteVersion!==APP_VERSION) state.ui.message=`Nouvelle version ${remoteVersion} détectée. Mise à jour en cours.`;
      if(swRegistration) await swRegistration.update();
