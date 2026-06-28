(() => {
  const DB = "resurgo-fitness-v1", STORE = "state", TODAY = new Date().toISOString().slice(0, 10);
  const $ = s => document.querySelector(s), el = id => document.getElementById(id);
  const uid = p => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const clone = v => typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const levels = { running: ["R0","R1","R2","R3","R4"], push: ["P0","P1","P2","P3","P4"], pull: ["T0","T1","T2","T3","T4"], legs: ["J0","J1","J2","J3","J4"], frontCore: ["G0","G1","G2","G3","G4"], sideCore: ["L0","L1","L2","L3","L4"], mobility: ["M0","M1","M2","M3","M4"] };
  const ex = [
    e("warmup_flow","Echauffement mobilité","warmup","time",1,300,0,"Mobilise hanches, épaules et dos.","Pas de geste brusque."),
    e("dead_bug","Dead bug","core","reps",3,8,40,"Côtes basses, expire lentement.","Stop si douleur vive."),
    e("bird_dog","Bird-dog","core","reps",3,8,40,"Bassin stable, dos long.","Stop si douleur descend dans la jambe."),
    e("front_plank","Planche avant-bras","core","time",3,25,45,"Bassin neutre, respiration calme.","Stop si cambrure ou douleur lombaire."),
    e("side_plank_knees","Gainage latéral genoux","core","time",2,25,35,"Hanches alignées, nuque longue.","Stop si douleur épaule ou hanche."),
    e("wall_pushup","Pompes murales","push","reps",2,12,45,"Reste gainé, amplitude propre.","Aucune douleur épaule."),
    e("incline_pushup","Pompes inclinées","push","reps",3,10,60,"Corps en bloc, coudes contrôlés.","Stop si épaule douloureuse."),
    e("band_row","Rowing élastique","pull","reps",3,12,50,"Épaules basses, tire les coudes.","Vérifie l'ancrage."),
    e("sit_to_stand","Assis-debout","legs","reps",3,12,60,"Genoux alignés, descente contrôlée.","Stop si douleur genou forte."),
    e("split_squat","Fente statique assistée","legs","reps",2,8,60,"Buste haut, appuis stables.","Pas de douleur tendon qui augmente."),
    e("hip_flexor","Mobilité psoas","mobility","time",2,35,20,"Bassin rentré, respiration lente.","Ne force jamais."),
    e("thoracic_rotation","Rotation thoracique","mobility","reps",2,8,20,"Tourne lentement, bassin stable.","Pas de douleur vive."),
    e("ankle_wall","Cheville genou au mur","mobility","reps",2,8,20,"Talon au sol, genou vers l'avant.","Pas de douleur tendon."),
    e("brisk_walk","Marche active","cardio","time",1,1800,0,"Rythme actif, respiration facile.","Ralentis si douleur."),
    e("easy_run","Course facile","cardio","time",1,1800,0,"Tu dois pouvoir parler.","Stop si tendon ou douleur irradiée."),
    e("low_impact_cardio","Cardio bas impact","cardio","time",1,1500,0,"Vélo, rameur doux ou marche inclinée.","Stop si douleur augmente."),
    e("cooldown_breathing","Retour au calme respiration","cooldown","time",1,180,0,"Respire lentement.","Reste confortable.")
  ];
  const empty = {
    schemaVersion: "1.0.0-vanilla", activeProfileId: null, profiles: [], assessments: [], plans: [], sessionRuns: [], metrics: [], activities: [],
    sources: [{ id:"manual",label:"Manuel",enabled:true,priority:3 },{ id:"json_import",label:"Import JSON",enabled:true,priority:2 },{ id:"mock_garmin",label:"Mock Garmin",enabled:true,priority:1 },{ id:"worker",label:"Worker Cloudflare",enabled:false,priority:1 }],
    settings: { tts:{ enabled:true, rate:1, pitch:1, volume:1, countdown:true, rest:true, cues:true, safetyAlways:true }, workerUrl:"", workerToken:"" },
    ui: { view:"today", search:"", filter:"all", message:"" }
  };
  let state = clone(empty), tick = null, left = 0;

  function e(id,name,family,type,sets,amount,rest,cue,safety) {
    return { id,name,family,type,sets,rest,cue,safety, reps:type==="reps"?amount:null, seconds:type==="time"?amount:null, short:`${name} progressif, adapté à la reprise.`, video:`https://example.com/resurgo/${id}` };
  }
  function db() { return new Promise((ok,ko) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
  async function get(k) { const d = await db(); return new Promise((ok,ko) => { const r = d.transaction(STORE).objectStore(STORE).get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }); }
  async function put(k,v) { const d = await db(); return new Promise((ok,ko) => { const r = d.transaction(STORE,"readwrite").objectStore(STORE).put(v,k); r.onsuccess = ok; r.onerror = () => ko(r.error); }); }
  async function save(msg="") { if (msg) state.ui.message = msg; await put("app", state); }
  const profile = () => state.profiles.find(p => p.id === state.activeProfileId);
  const plan = () => profile() ? state.plans.filter(s => s.profileId === profile().id && !s.completedAt) : [];
  const run = () => state.sessionRuns.find(r => !r.completedAt && !r.abortedAt);
  const exercise = id => ex.find(x => x.id === id);
  const currentEx = () => { const r = run(), s = state.plans.find(x => x.id === r?.sessionId); return exercise(s?.exerciseIds[r.exerciseIndex]); };
  const n = id => { const v = Number(el(id)?.value); return Number.isFinite(v) ? v : 0; };
  const sec = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  function createProfile() {
    const p = { id:uid("profile"), name:"Damien", createdAt:new Date().toISOString(), age:40, heightCm:"", startWeightKg:100, targetWeightKg:85, availabilityDays:3, equipment:"élastique, chaise, tapis", sportsHistory:"Course, boxe, karaté, VTT.", health:{backPain:1,kneePain:0,tendonPain:0,fatigue:2,irradiating:false,neurological:false}, levels:{running:"R2",push:"P2",pull:"T1",legs:"J2",frontCore:"G2",sideCore:"L1",mobility:"M2"}, dataPreferences:{primaryWeight:"garmin_index_s2",primaryActivities:"garmin",dedup:true} };
    state.profiles.push(p); state.activeProfileId = p.id;
    state.assessments.push({ id:uid("assessment"), profileId:p.id, date:TODAY, tests:clone(p.levels) });
    makeWeek(p.id); save("Profil créé.").then(render);
  }
  function makeWeek(pid, short=false) {
    const p = state.profiles.find(x => x.id === pid); if (!p) return;
    const protect = p.health.backPain >= 3 || p.health.kneePain >= 3 || p.health.tendonPain >= 3 || p.health.irradiating || p.health.neurological;
    const cardio = protect ? "brisk_walk" : "easy_run";
    const sets = [
      ["Force profonde", short?22:38, "strength", short?["warmup_flow","dead_bug","bird_dog","sit_to_stand","cooldown_breathing"]:["warmup_flow","dead_bug","bird_dog","incline_pushup","band_row","sit_to_stand","cooldown_breathing"]],
      [protect?"Marche protection":"Course facile", protect?25:30, "cardio", [cardio]],
      ["Renfo mobilité", short?18:30, "mobility", short?["hip_flexor","thoracic_rotation","bird_dog"]:["hip_flexor","ankle_wall","side_plank_knees","band_row","sit_to_stand"]]
    ];
    state.plans = state.plans.filter(s => !(s.profileId === pid && !s.completedAt));
    state.plans.push(...sets.map((s,i) => ({ id:uid(`session${i}`), profileId:pid, title:s[0], minutes:s[1], type:s[2], phase:1, week:1, date:TODAY, exerciseIds:s[3], short, completedAt:null })));
  }
  function decision(p) {
    const planned = state.plans.filter(s => s.profileId === p.id), done = planned.filter(s => s.completedAt).length, adh = planned.length ? done / planned.length : 0;
    const pain = Math.max(p.health.backPain,p.health.kneePain,p.health.tendonPain);
    if (p.health.irradiating || p.health.neurological || pain >= 3 || p.health.fatigue >= 5) return ["red","Protection","Marche, mobilité, gainage profond. Pas de progression."];
    if (adh < .4 || p.health.fatigue >= 4) return ["orange","Correction","Semaine courte et maintien du lien."];
    if (adh >= .65 && pain <= 2 && p.health.fatigue <= 3) return ["green","Progression","Progression légère possible."];
    return ["blue","Maintien","Répéter la semaine proprement."];
  }
  function start(id) {
    const s = state.plans.find(x => x.id === id); if (!s) return;
    state.sessionRuns = state.sessionRuns.filter(x => x.completedAt || x.abortedAt);
    state.sessionRuns.push({ id:uid("run"), profileId:s.profileId, sessionId:s.id, exerciseIndex:0, setIndex:0, logs:[], safetyAlerts:[], startedAt:new Date().toISOString(), completedAt:null, abortedAt:null });
    state.ui.view = "session"; speak(`Prochain exercice. ${currentEx().name}. ${currentEx().cue}`); save("Séance lancée.").then(render);
  }
  function log(success,pain,difficulty) {
    stopTimer(); const r = run(), s = state.plans.find(x => x.id === r?.sessionId), x = currentEx(); if (!r || !s || !x) return;
    r.logs.push({ exerciseId:x.id, set:r.setIndex+1, success, pain, difficulty, at:new Date().toISOString() });
    if (pain >= 3) { r.safetyAlerts.push(`${x.name}: douleur ${pain}/5`); speak("Alerte sécurité. Stop ou version plus facile.","safety"); }
    const doneEx = pain >= 3 || success === "stop" || r.setIndex + 1 >= x.sets;
    if (doneEx && r.exerciseIndex + 1 >= s.exerciseIds.length) {
      r.completedAt = s.completedAt = new Date().toISOString(); state.activities.push({ id:uid("activity"), profileId:r.profileId, source:"manual", type:s.type, startedAt:r.startedAt, durationSeconds:s.minutes*60 }); state.ui.view = "stats"; speak("Séance terminée. Résumé enregistré.");
    } else if (doneEx) { r.exerciseIndex++; r.setIndex = 0; speak(`Exercice suivant. ${currentEx().name}.`); }
    else { r.setIndex++; if (state.settings.tts.rest) speak(`Repos ${x.rest} secondes.`); }
    save("Résultat enregistré.").then(render);
  }
  function speak(text, kind="cue") {
    if ((!state.settings.tts.enabled && kind !== "safety") || !("speechSynthesis" in window)) return;
    if (kind === "safety") speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang="fr-FR"; u.rate=state.settings.tts.rate; u.pitch=state.settings.tts.pitch; u.volume=state.settings.tts.volume; speechSynthesis.speak(u);
  }
  function startTimer() {
    const x = currentEx(); if (!x) return; stopTimer(); left = x.type === "time" ? x.seconds : 5; updateTimer(); speak(x.type === "time" ? "Timer lancé." : "Prévisualisation.");
    tick = setInterval(() => { left--; if (state.settings.tts.countdown && [10,5,3,2,1].includes(left)) speak(String(left),"timer"); updateTimer(); if (left <= 0) { stopTimer(); speak("Temps terminé. Enregistre le résultat."); } }, 1000);
  }
  function stopTimer(){ if (tick) clearInterval(tick); tick = null; }
  function updateTimer(){ const t = el("timer"); if (t) t.textContent = sec(Math.max(left,0)); }
  function diagram(id){ const label=esc(id.split("_").join(" ")); return `<svg viewBox="0 0 420 220" role="img" aria-label="${label}"><rect width="420" height="220" rx="18" fill="#eef5ef"/><circle cx="130" cy="64" r="18" fill="#12231f"/><path d="M130 84v68M130 110l-56 34M132 112l78 28M130 152l-54 40M134 152l78 38" stroke="#12231f" stroke-width="12" stroke-linecap="round"/><path d="M232 70c48 18 82 58 100 110" fill="none" stroke="#f57b45" stroke-width="8" stroke-linecap="round"/><path d="M64 196h260" stroke="#b9f66b" stroke-width="8" stroke-linecap="round"/><text x="24" y="32" font-size="18" font-family="Arial" fill="#12231f">${label}</text></svg>`; }

  function shell(content) {
    const nav = ["today","plan","session","exercises","stats","settings"];
    return `<main class="app"><header class="top"><div class="brand"><span class="logo">RG</span>ResurGo</div><span class="pill">${navigator.onLine?"Online":"Offline"} · PWA statique</span></header><nav class="tabs">${nav.map(v=>`<button class="tab ${state.ui.view===v?"active":""}" data-view="${v}"><span>${{today:"⌂",plan:"▦",session:"▶",exercises:"◉",stats:"◷",settings:"⚙"}[v]}</span><span>${{today:"Aujourd’hui",plan:"Plan",session:"Séance",exercises:"Exos",stats:"Stats",settings:"Réglages"}[v]}</span></button>`).join("")}</nav>${state.ui.message?`<p class="notice">${esc(state.ui.message)}</p>`:""}${content}</main>`;
  }
  function today() {
    const p = profile(); if (!p) return `<section class="hero"><p class="eyebrow">Coach sportif local-first</p><h1>ResurGo Fitness</h1><p>PWA complète en HTML/CSS/JS vanilla : offline, IndexedDB, séance guidée, TTS, export JSON, Garmin via Worker optionnel.</p><button class="primary" id="createProfile">Créer le profil de départ</button></section>`;
    const d = decision(p), m = latestMetric(), next = plan()[0];
    return `<section class="grid"><h1>Aujourd'hui</h1><div class="grid two"><article class="panel"><p class="eyebrow">Profil actif</p><h2>${esc(p.name)}</h2><div class="row"><span>Objectif</span><strong>${p.startWeightKg} → ${p.targetWeightKg} kg</strong></div><div class="row"><span>Poids récent</span><strong>${m?m.weightKg+" kg":"À saisir"}</strong></div><div class="row"><span>Décision</span><strong class="status ${d[0]}">${d[1]}</strong></div><p class="muted">${d[2]}</p></article><article class="panel"><p class="eyebrow">Séance recommandée</p><h2>${next?.title||"Plan à générer"}</h2><p class="muted">${next?`${next.minutes} min · ${next.exerciseIds.length} blocs`:"Aucune séance active."}</p><div class="actions"><button class="primary" id="startToday">Démarrer</button><button class="secondary" id="shortWeek">Semaine courte</button><button class="secondary" id="activeRest">Repos actif</button></div></article></div><article class="panel"><h2>Check rapide</h2><div class="grid three"><label>Dos 0-5<input id="quickBack" type="number" min="0" max="5" value="${p.health.backPain}"></label><label>Genou/tendon 0-5<input id="quickKnee" type="number" min="0" max="5" value="${Math.max(p.health.kneePain,p.health.tendonPain)}"></label><label>Fatigue 0-5<input id="quickFatigue" type="number" min="0" max="5" value="${p.health.fatigue}"></label></div><button class="secondary" id="saveQuick">Enregistrer check</button></article><p class="notice">Sécurité : stop en cas de douleur irradiée, faiblesse, engourdissement, douleur forte ou symptôme inquiétant.</p></section>`;
  }
  function planView(){ if(!profile()) return needProfile(); return `<section class="grid"><h1>Plan adaptatif</h1><div class="actions"><button class="primary" id="regen">Générer semaine</button><button class="secondary" id="shortWeek">Semaine minimale viable</button></div>${plan().map(s=>`<article class="panel"><p class="eyebrow">Phase ${s.phase} · semaine ${s.week} · ${s.type}</p><h2>${s.title}</h2><p class="muted">${s.minutes} min · ${s.exerciseIds.map(id=>exercise(id).name).join(" · ")}</p><button class="primary" data-start="${s.id}">Lancer</button></article>`).join("")}</section>`; }
  function sessionView(){ const r=run(); if(!r) return `<section class="grid"><h1>Séance</h1><article class="panel"><p>Aucune séance en cours.</p><button class="primary" id="startToday">Lancer la prochaine séance</button></article></section>`; const s=state.plans.find(x=>x.id===r.sessionId), x=currentEx(), logs=r.logs.filter(l=>l.exerciseId===x.id); return `<section class="session"><div class="diagram">${diagram(x.id)}</div><article class="panel"><p class="eyebrow">${s.title} · exercice ${r.exerciseIndex+1}/${s.exerciseIds.length} · série ${r.setIndex+1}/${x.sets}</p><h1>${x.name}</h1><p>${x.short}</p><p><strong>Consigne :</strong> ${x.cue}</p><p class="notice">${x.safety}</p><div class="timer" id="timer">${x.type==="time"?sec(left||x.seconds):`${x.reps} reps`}</div><div class="actions"><button class="primary" id="startTimer">${x.type==="time"?"Lancer timer":"Prévisualiser"}</button><button class="primary" id="okSet">Réussi</button><button class="secondary" id="partialSet">Partiel / dur</button><button class="danger" id="painSet">Douleur / stop</button><button class="secondary" id="speakCue">Voix</button><button class="danger" id="abortSession">Abandonner</button></div><p class="muted">${logs.length} série(s) enregistrée(s).</p></article></section>`; }
  function exercisesView(){ const f=state.ui.filter, q=state.ui.search.toLowerCase(), fam=[...new Set(ex.map(x=>x.family))]; const list=ex.filter(x=>(f==="all"||x.family===f)&&`${x.name} ${x.family} ${x.cue}`.toLowerCase().includes(q)); return `<section class="grid"><h1>Exercices</h1><div class="panel"><div class="grid two"><label>Recherche<input id="search" value="${esc(state.ui.search)}"></label><label>Famille<select id="familyFilter"><option value="all">Toutes</option>${fam.map(x=>`<option value="${x}" ${f===x?"selected":""}>${x}</option>`).join("")}</select></label></div></div><div class="grid two">${list.map(x=>`<article class="panel exercise"><div class="diagram">${diagram(x.id)}</div><p class="eyebrow">${x.family} · ${x.type}</p><h2>${x.name}</h2><p>${x.short}</p><p><strong>Points clés :</strong> ${x.cue}</p><p class="muted">Vidéo online : ${x.video}</p></article>`).join("")}</div></section>`; }
  function stats(){ if(!profile()) return needProfile(); const m=state.metrics.filter(x=>x.profileId===profile().id), done=state.sessionRuns.filter(x=>x.profileId===profile().id&&x.completedAt), last=latestMetric(), trend=m.length>1?(last.weightKg-m[0].weightKg).toFixed(1):"0.0"; return `<section class="grid"><h1>Statistiques</h1><div class="grid three"><article class="panel"><p class="eyebrow">Poids</p><h2>${last?last.weightKg+" kg":"À saisir"}</h2></article><article class="panel"><p class="eyebrow">Tendance</p><h2>${trend} kg</h2></article><article class="panel"><p class="eyebrow">Séances</p><h2>${done.length}</h2></article></div><article class="panel"><h2>Ajouter une mesure</h2><div class="grid three"><label>Poids kg<input id="weightKg" type="number" step="0.1"></label><label>Masse grasse %<input id="fatPct" type="number" step="0.1"></label><label>Tour taille cm<input id="waistCm" type="number" step="0.1"></label></div><button class="primary" id="addMetric">Ajouter</button></article><article class="panel"><h2>Historique</h2>${m.slice(-8).reverse().map(x=>`<div class="row"><span>${new Date(x.measuredAt).toLocaleDateString("fr-FR")}</span><strong>${x.weightKg} kg</strong></div>`).join("")||"<p>Aucune mesure.</p>"}</article></section>`; }
  function settings(){ const p=profile(); return `<section class="grid"><h1>Réglages</h1><article class="panel"><h2>Profils</h2>${state.profiles.map(x=>`<div class="row"><span>${esc(x.name)}</span><button class="secondary" data-profile="${x.id}">${x.id===state.activeProfileId?"Actif":"Choisir"}</button></div>`).join("")}<button class="primary" id="createProfile">Nouveau profil</button></article>${p?profileForm(p):""}<article class="panel"><h2>Coach vocal</h2><div class="grid three"><label>Activé<select id="ttsEnabled"><option value="true" ${state.settings.tts.enabled?"selected":""}>Oui</option><option value="false" ${!state.settings.tts.enabled?"selected":""}>Non</option></select></label><label>Vitesse<input id="ttsRate" type="number" min="0.7" max="1.4" step="0.1" value="${state.settings.tts.rate}"></label><label>Volume<input id="ttsVolume" type="number" min="0" max="1" step="0.1" value="${state.settings.tts.volume}"></label></div><button class="secondary" id="saveTts">Enregistrer voix</button><button class="secondary" id="testVoice">Tester</button></article><article class="panel"><h2>Worker Garmin optionnel</h2><p class="muted">La V1 fonctionne sans Worker. Le Worker sert au proxy Garmin/KV.</p><label>URL Worker<input id="workerUrl" value="${esc(state.settings.workerUrl)}"></label><label>Token app<input id="workerToken" value="${esc(state.settings.workerToken)}" type="password"></label><div class="actions"><button class="secondary" id="saveWorker">Enregistrer</button><button class="secondary" id="testWorker">Tester</button><button class="secondary" id="mockGarmin">Mock Garmin</button></div></article><article class="panel"><h2>Export / import JSON</h2><div class="actions"><button class="primary" id="exportJson">Exporter sans secrets</button><button class="secondary" id="exportJsonSecrets">Exporter avec token Worker</button><label class="secondary file">Importer JSON<input id="importJson" type="file" accept="application/json"></label></div></article><article class="panel"><h2>Maintenance</h2><button class="danger" id="deleteProfile">Supprimer profil actif</button><button class="danger" id="resetAll">Tout effacer localement</button></article></section>`; }
  function profileForm(p){ return `<article class="panel"><h2>Profil actif</h2><div class="grid three"><label>Nom<input id="profileName" value="${esc(p.name)}"></label><label>Âge<input id="age" type="number" value="${p.age||""}"></label><label>Taille cm<input id="heightCm" type="number" value="${p.heightCm||""}"></label><label>Poids départ<input id="startWeightKg" type="number" value="${p.startWeightKg}"></label><label>Poids objectif<input id="targetWeightKg" type="number" value="${p.targetWeightKg}"></label><label>Jours/semaine<input id="availabilityDays" type="number" value="${p.availabilityDays}"></label></div><label>Matériel<input id="equipment" value="${esc(p.equipment)}"></label><label>Historique sportif<textarea id="sportsHistory">${esc(p.sportsHistory)}</textarea></label><div class="grid three"><label>Dos<input id="backPain" type="number" min="0" max="5" value="${p.health.backPain}"></label><label>Genou<input id="kneePain" type="number" min="0" max="5" value="${p.health.kneePain}"></label><label>Tendon<input id="tendonPain" type="number" min="0" max="5" value="${p.health.tendonPain}"></label><label>Fatigue<input id="fatigue" type="number" min="0" max="5" value="${p.health.fatigue}"></label><label><input id="irradiating" type="checkbox" ${p.health.irradiating?"checked":""}> Douleur irradiée</label><label><input id="neurological" type="checkbox" ${p.health.neurological?"checked":""}> Signe neurologique</label></div><h3>Tests initiaux</h3><div class="grid three">${Object.keys(levels).map(k=>`<label>${k}<select id="level_${k}">${levels[k].map(v=>`<option ${p.levels[k]===v?"selected":""}>${v}</option>`).join("")}</select></label>`).join("")}</div><button class="primary" id="saveProfile">Enregistrer profil + régénérer plan</button></article>`; }
  function needProfile(){ return `<section class="hero"><h1>Profil requis</h1><p>Crée un profil pour activer cette page.</p><button class="primary" id="createProfile">Créer le profil</button></section>`; }
  function latestMetric(){ const p=profile(); return p ? state.metrics.filter(m=>m.profileId===p.id&&m.weightKg).sort((a,b)=>new Date(a.measuredAt)-new Date(b.measuredAt)).at(-1) : null; }
  function exportJson(secret=false){ const c=clone(state); if(!secret) c.settings.workerToken=""; const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),...c},null,2)],{type:"application/json"})); a.download=`resurgo-export-${TODAY}.json`; a.click(); URL.revokeObjectURL(a.href); }
  async function importJson(file){ const p=JSON.parse(await file.text()); state={...clone(empty),...p,ui:{...empty.ui,...(p.ui||{})}}; delete state.exportedAt; await save("Import JSON terminé."); render(); }
  async function worker(path, init={}){ const base=state.settings.workerUrl.replace(/\/$/,""); if(!base) throw new Error("URL Worker manquante."); const h={"content-type":"application/json",...(init.headers||{})}; if(state.settings.workerToken) h.authorization=`Bearer ${state.settings.workerToken}`; const r=await fetch(base+path,{...init,headers:h}), b=await r.json().catch(()=>({})); if(!r.ok) throw new Error(b.error||`Worker ${r.status}`); return b; }
  async function testWorker(){ try{ const r=await worker("/health"); state.ui.message=`Worker OK: ${r.service||"health"}`; }catch(e){ state.ui.message=`Worker erreur: ${e.message}`; } render(); }
  async function mockGarmin(){ try{ const r=await worker("/v1/garmin/mock-sync",{method:"POST",body:JSON.stringify({profileId:profile()?.id})}); state.metrics.push(...(r.metrics||[])); state.activities.push(...(r.activities||[])); await save("Mock Garmin importé."); }catch(e){ state.ui.message=`Mock Garmin impossible: ${e.message}`; } render(); }
  function render(){ const views={today,plan:planView,session:sessionView,exercises:exercisesView,stats,settings}; $("#app").innerHTML=shell((views[state.ui.view]||today)()); bind(); }
  function on(id,fn){ const x=el(id); if(x) x.onclick=fn; }
  function bind(){
    document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{state.ui.view=b.dataset.view; save().then(render);});
    document.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>start(b.dataset.start));
    document.querySelectorAll("[data-profile]").forEach(b=>b.onclick=()=>{state.activeProfileId=b.dataset.profile; save("Profil actif changé.").then(render);});
    on("createProfile",createProfile); on("startToday",()=>start(plan()[0]?.id)); on("shortWeek",()=>{const p=profile(); if(p){makeWeek(p.id,true); save("Semaine courte générée.").then(render);}});
    on("activeRest",()=>{const p=profile(); if(p){state.activities.push({id:uid("activity"),profileId:p.id,source:"manual",type:"walk",startedAt:new Date().toISOString(),durationSeconds:1200}); save("Repos actif enregistré.").then(render);}});
    on("saveQuick",()=>{const p=profile(); if(p){p.health.backPain=n("quickBack"); p.health.kneePain=n("quickKnee"); p.health.tendonPain=n("quickKnee"); p.health.fatigue=n("quickFatigue"); save("Check rapide enregistré.").then(render);}});
    on("regen",()=>{const p=profile(); if(p){makeWeek(p.id); save("Semaine générée.").then(render);}}); on("startTimer",startTimer); on("okSet",()=>log("yes",0,"ok")); on("partialSet",()=>log("partial",1,"hard")); on("painSet",()=>log("stop",3,"too_hard")); on("speakCue",()=>{const x=currentEx(); if(x) speak(`${x.name}. ${x.cue}`);}); on("abortSession",()=>{const r=run(); if(r){r.abortedAt=new Date().toISOString(); state.ui.view="today"; stopTimer(); save("Séance arrêtée.").then(render);}});
    on("addMetric",()=>{const p=profile(), w=n("weightKg"); if(p&&w){state.metrics.push({id:uid("metric"),profileId:p.id,source:"manual",measuredAt:new Date().toISOString(),weightKg:w,bodyFatPct:n("fatPct")||null,waistCm:n("waistCm")||null}); save("Mesure enregistrée.").then(render);}});
    on("saveProfile",()=>{const p=profile(); if(!p) return; p.name=el("profileName").value||p.name; p.age=n("age")||p.age; p.heightCm=el("heightCm").value; p.startWeightKg=n("startWeightKg")||p.startWeightKg; p.targetWeightKg=n("targetWeightKg")||p.targetWeightKg; p.availabilityDays=n("availabilityDays")||p.availabilityDays; p.equipment=el("equipment").value; p.sportsHistory=el("sportsHistory").value; ["backPain","kneePain","tendonPain","fatigue"].forEach(k=>p.health[k]=n(k)); p.health.irradiating=el("irradiating").checked; p.health.neurological=el("neurological").checked; Object.keys(levels).forEach(k=>p.levels[k]=el(`level_${k}`).value); makeWeek(p.id); save("Profil et plan mis à jour.").then(render);});
    on("saveTts",()=>{state.settings.tts.enabled=el("ttsEnabled").value==="true"; state.settings.tts.rate=n("ttsRate")||1; state.settings.tts.volume=n("ttsVolume"); save("Voix enregistrée.").then(render);}); on("testVoice",()=>speak("ResurGo est prêt pour la séance.")); on("saveWorker",()=>{state.settings.workerUrl=el("workerUrl").value; state.settings.workerToken=el("workerToken").value; save("Worker enregistré.").then(render);}); on("testWorker",testWorker); on("mockGarmin",mockGarmin); on("exportJson",()=>exportJson(false)); on("exportJsonSecrets",()=>exportJson(true)); on("deleteProfile",()=>{const p=profile(); if(p&&confirm("Supprimer ce profil local ?")){state.profiles=state.profiles.filter(x=>x.id!==p.id); state.activeProfileId=state.profiles[0]?.id||null; save("Profil supprimé.").then(render);}}); on("resetAll",()=>{if(confirm("Effacer toutes les données locales ResurGo ?")){state=clone(empty); save("Données locales effacées.").then(render);}});
    const imp=el("importJson"); if(imp) imp.onchange=e=>e.target.files[0]&&importJson(e.target.files[0]); const s=el("search"); if(s) s.oninput=e=>{state.ui.search=e.target.value; render();}; const f=el("familyFilter"); if(f) f.onchange=e=>{state.ui.filter=e.target.value; render();};
  }
  async function init(){ state=(await get("app"))||clone(empty); if(!state.profiles) state=clone(empty); if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{}); render(); }
  init();
})();
