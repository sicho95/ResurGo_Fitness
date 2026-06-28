(() => {
  const DB_NAME = "resurgo-static";
  const DB_VERSION = 1;
  const STORE = "state";
  const today = new Date().toISOString().slice(0, 10);

  const exercises = [
    { id: "dead_bug", name: "Dead bug", family: "Core", level: "Départ", sets: 3, reps: 8, rest: 40, cue: "Côtes basses, expire lentement.", safety: "Stop si douleur vive.", type: "reps" },
    { id: "bird_dog", name: "Bird-dog", family: "Core", level: "Départ", sets: 3, reps: 8, rest: 40, cue: "Bassin stable, dos long.", safety: "Stop si douleur descend dans la jambe.", type: "reps" },
    { id: "incline_pushup", name: "Pompes inclinées", family: "Push", level: "Débutant", sets: 3, reps: 10, rest: 60, cue: "Corps en bloc, coudes contrôlés.", safety: "Stop si épaule douloureuse.", type: "reps" },
    { id: "band_row", name: "Rowing élastique", family: "Pull", level: "Débutant", sets: 3, reps: 12, rest: 50, cue: "Épaules basses, tire les coudes.", safety: "Vérifie l'ancrage.", type: "reps" },
    { id: "sit_to_stand", name: "Assis-debout", family: "Jambes", level: "Départ", sets: 3, reps: 12, rest: 60, cue: "Genoux alignés, descente contrôlée.", safety: "Stop si douleur genou forte.", type: "reps" },
    { id: "hip_flexor", name: "Mobilité psoas", family: "Mobilité", level: "Départ", sets: 2, seconds: 35, rest: 20, cue: "Bassin rentré, respiration lente.", safety: "Ne force jamais.", type: "time" },
    { id: "easy_run", name: "Course facile", family: "Cardio", level: "R2", sets: 1, seconds: 1800, rest: 0, cue: "Aisance respiratoire, tu dois pouvoir parler.", safety: "Stop si tendon ou douleur irradiée.", type: "time" }
  ];

  const defaultState = {
    profile: null,
    settings: { tts: true, workerUrl: "", workerToken: "" },
    plan: [],
    sessions: [],
    metrics: [],
    active: null,
    view: "today"
  };

  let state = structuredClone(defaultState);
  const app = document.getElementById("app");

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbSet(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const request = tx.objectStore(STORE).put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function save() {
    await dbSet("app", state);
  }

  function speak(text, safety = false) {
    if (!state.settings.tts && !safety) return;
    if (!("speechSynthesis" in window)) return;
    if (safety) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 1;
    speechSynthesis.speak(u);
  }

  function createProfile() {
    state.profile = {
      id: `profile_${Date.now()}`,
      name: "Damien",
      createdAt: new Date().toISOString(),
      startWeightKg: 100,
      targetWeightKg: 85,
      runningLevel: "R2",
      backPain: 1,
      kneePain: 0,
      fatigue: 2,
      note: "Profil de départ modifiable. Question à Damien : compléter taille et douleurs actuelles."
    };
    generatePlan();
    save().then(render);
  }

  function generatePlan(short = false) {
    if (!state.profile) return;
    const base = [
      { id: `s_${Date.now()}_a`, title: short ? "Force courte" : "Force profonde", type: "Renfo", minutes: short ? 22 : 35, exerciseIds: short ? ["dead_bug", "bird_dog", "sit_to_stand"] : ["dead_bug", "bird_dog", "incline_pushup", "band_row", "sit_to_stand"] },
      { id: `s_${Date.now()}_b`, title: "Course facile", type: "Cardio", minutes: 30, exerciseIds: ["easy_run"] },
      { id: `s_${Date.now()}_c`, title: short ? "Mobilité courte" : "Renfo mobilité", type: "Mobilité", minutes: short ? 18 : 30, exerciseIds: short ? ["hip_flexor", "bird_dog"] : ["hip_flexor", "bird_dog", "band_row", "sit_to_stand"] }
    ];
    state.plan = base;
  }

  function startSession(sessionId) {
    const session = state.plan.find(s => s.id === sessionId) || state.plan[0];
    if (!session) return;
    state.active = { id: `run_${Date.now()}`, sessionId: session.id, exerciseIndex: 0, setIndex: 0, logs: [], startedAt: new Date().toISOString(), completedAt: null };
    state.view = "session";
    save().then(render);
  }

  function logSet(success, pain) {
    const session = state.plan.find(s => s.id === state.active?.sessionId);
    if (!session) return;
    const exercise = exercises.find(e => e.id === session.exerciseIds[state.active.exerciseIndex]);
    state.active.logs.push({ exerciseId: exercise.id, set: state.active.setIndex + 1, success, pain, at: new Date().toISOString() });
    if (pain >= 3) speak("Alerte douleur. On arrête ou on remplace cet exercice.", true);
    const doneExercise = pain >= 3 || state.active.setIndex + 1 >= exercise.sets || success === "stop";
    if (doneExercise && state.active.exerciseIndex + 1 >= session.exerciseIds.length) {
      state.active.completedAt = new Date().toISOString();
      state.sessions.push(state.active);
      state.active = null;
      state.view = "stats";
    } else if (doneExercise) {
      state.active.exerciseIndex += 1;
      state.active.setIndex = 0;
    } else {
      state.active.setIndex += 1;
    }
    save().then(render);
  }

  function addWeight() {
    const value = Number(document.getElementById("weight").value);
    if (!value) return;
    state.metrics.push({ id: `m_${Date.now()}`, date: today, weightKg: value, source: "manual" });
    save().then(render);
  }

  function exportJson() {
    const payload = { schemaVersion: "1.0.0-static", exportedAt: new Date().toISOString(), ...state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `resurgo-${today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(file) {
    const payload = JSON.parse(await file.text());
    state = { ...structuredClone(defaultState), ...payload };
    delete state.schemaVersion;
    delete state.exportedAt;
    await save();
    render();
  }

  async function testWorker() {
    const box = document.getElementById("workerResult");
    try {
      const url = state.settings.workerUrl.replace(/\/$/, "");
      const res = await fetch(`${url}/health`);
      box.textContent = JSON.stringify(await res.json(), null, 2);
    } catch (err) {
      box.textContent = `Erreur Worker : ${err.message}`;
    }
  }

  function icon(name) {
    const icons = { today: "⌂", plan: "▦", session: "▶", stats: "◷", settings: "⚙" };
    return icons[name] || "•";
  }

  function diagram(id) {
    return `<svg viewBox="0 0 420 220" role="img" aria-label="${id}"><rect width="420" height="220" rx="18" fill="#eef5ef"/><circle cx="128" cy="74" r="18" fill="#12231f"/><path d="M128 94v70M128 118l-54 34M130 120l76 28M128 164l-54 38M132 164l76 36" stroke="#12231f" stroke-width="12" stroke-linecap="round"/><path d="M222 72c52 20 88 60 106 114" fill="none" stroke="#f57b45" stroke-width="8" stroke-linecap="round"/><path d="M64 202h260" stroke="#b9f66b" stroke-width="8" stroke-linecap="round"/><text x="24" y="32" font-size="18" font-family="Arial" fill="#12231f">${id.replaceAll("_", " ")}</text></svg>`;
  }

  function layout(content) {
    return `<main class="app">
      <header class="top"><div class="brand"><span class="logo">RG</span>ResurGo</div><span class="pill">${navigator.onLine ? "Online" : "Offline"} · PWA statique</span></header>
      <nav class="tabs">${["today", "plan", "session", "stats", "settings"].map(v => `<button class="tab ${state.view === v ? "active" : ""}" data-view="${v}"><span>${icon(v)}</span><span>${label(v)}</span></button>`).join("")}</nav>
      ${content}
    </main>`;
  }

  function label(view) {
    return { today: "Aujourd’hui", plan: "Plan", session: "Séance", stats: "Stats", settings: "Réglages" }[view];
  }

  function todayView() {
    if (!state.profile) {
      return `<section class="hero"><p class="eyebrow">Coach sportif local-first</p><h1>ResurGo Fitness</h1><p>PWA 100% statique pour GitHub Pages : offline, export JSON, séance guidée et données locales.</p><button class="primary" id="createProfile">Créer le profil de départ</button></section>`;
    }
    const next = state.plan[0];
    const done = state.sessions.length;
    const color = state.profile.backPain >= 3 || state.profile.kneePain >= 3 ? "red" : done >= 2 ? "green" : "blue";
    return `<section class="grid">
      <h1>Aujourd’hui</h1>
      <div class="grid two">
        <article class="panel"><p class="eyebrow">Profil actif</p><h2>${state.profile.name}</h2><div class="row"><span>Objectif</span><strong>${state.profile.startWeightKg} → ${state.profile.targetWeightKg} kg</strong></div><div class="row"><span>Course</span><strong>${state.profile.runningLevel}</strong></div><div class="row"><span>État</span><strong class="status ${color}">${color === "red" ? "Protection" : color === "green" ? "Progression" : "Maintien"}</strong></div></article>
        <article class="panel"><p class="eyebrow">Recommandé</p><h2>${next?.title || "Plan prêt"}</h2><p class="muted">${next ? `${next.minutes} min · ${next.exerciseIds.length} exercices` : "Génère une semaine."}</p><div class="actions"><button class="primary" id="startToday">Démarrer</button><button class="secondary" id="shortWeek">Version courte</button></div></article>
      </div>
      <p class="notice">Sécurité : cette app ne remplace pas un médecin ou un kiné. Stop si douleur irradiée, faiblesse, engourdissement ou douleur forte.</p>
    </section>`;
  }

  function planView() {
    return `<section class="grid"><h1>Plan</h1>${state.plan.map(s => `<article class="panel"><p class="eyebrow">${s.type} · ${s.minutes} min</p><h2>${s.title}</h2><p class="muted">${s.exerciseIds.map(id => exercises.find(e => e.id === id).name).join(" · ")}</p><button class="primary" data-start="${s.id}">Lancer</button></article>`).join("") || `<article class="panel"><p>Aucun plan.</p><button class="primary" id="regen">Générer</button></article>`}</section>`;
  }

  function sessionView() {
    if (!state.active) return `<section class="grid"><h1>Séance</h1><article class="panel"><p>Lance une séance depuis Aujourd’hui ou Plan.</p></article></section>`;
    const session = state.plan.find(s => s.id === state.active.sessionId);
    const ex = exercises.find(e => e.id === session.exerciseIds[state.active.exerciseIndex]);
    return `<section class="session"><div class="diagram">${diagram(ex.id)}</div><article class="panel"><p class="eyebrow">${session.title} · exercice ${state.active.exerciseIndex + 1}/${session.exerciseIds.length} · série ${state.active.setIndex + 1}/${ex.sets}</p><h1>${ex.name}</h1><p>${ex.cue}</p><p class="notice">${ex.safety}</p><div class="timer">${ex.type === "time" ? `${Math.round((ex.seconds || 0) / 60)}:00` : `${ex.reps} reps`}</div><div class="actions"><button class="primary" id="okSet">Réussi</button><button class="secondary" id="partialSet">Partiel</button><button class="danger" id="painSet">Douleur / stop</button><button class="secondary" id="speakCue">Voix</button></div></article></section>`;
  }

  function statsView() {
    const latest = state.metrics.at(-1);
    return `<section class="grid"><h1>Statistiques</h1><div class="grid three"><article class="panel"><p class="eyebrow">Poids</p><h2>${latest ? `${latest.weightKg} kg` : "À saisir"}</h2></article><article class="panel"><p class="eyebrow">Séances</p><h2>${state.sessions.length}</h2></article><article class="panel"><p class="eyebrow">Données</p><h2>${state.metrics.length}</h2></article></div><article class="panel"><h2>Saisie poids</h2><div class="actions"><input id="weight" type="number" step="0.1" placeholder="Poids kg"><button class="primary" id="addWeight">Ajouter</button></div></article></section>`;
  }

  function settingsView() {
    return `<section class="grid"><h1>Réglages</h1><article class="panel"><h2>Sauvegarde iCloud JSON</h2><p class="muted">Export/import complet des données locales.</p><div class="actions"><button class="primary" id="exportJson">Exporter JSON</button><label class="secondary file">Importer JSON<input id="importJson" type="file" accept="application/json"></label></div></article><article class="panel"><h2>Coach vocal</h2><label><input id="tts" type="checkbox" ${state.settings.tts ? "checked" : ""}> Activer la voix</label><button class="secondary" id="testVoice">Tester</button></article><article class="panel"><h2>Worker Garmin optionnel</h2><p class="muted">Facultatif. L'app fonctionne offline sans Worker.</p><label>URL Worker<input id="workerUrl" value="${state.settings.workerUrl}" placeholder="https://resurgo-fitness-sync.xxx.workers.dev"></label><label>Token app<input id="workerToken" value="${state.settings.workerToken}" type="password"></label><div class="actions"><button class="secondary" id="saveWorker">Enregistrer</button><button class="secondary" id="testWorker">Tester Worker</button></div><pre id="workerResult"></pre></article><article class="panel"><h2>Reset local</h2><button class="danger" id="reset">Effacer les données locales</button></article></section>`;
  }

  function render() {
    const views = { today: todayView, plan: planView, session: sessionView, stats: statsView, settings: settingsView };
    app.innerHTML = layout((views[state.view] || todayView)());
    bind();
  }

  function bind() {
    document.querySelectorAll("[data-view]").forEach(btn => btn.onclick = () => { state.view = btn.dataset.view; save().then(render); });
    const byId = id => document.getElementById(id);
    if (byId("createProfile")) byId("createProfile").onclick = createProfile;
    if (byId("startToday")) byId("startToday").onclick = () => startSession(state.plan[0]?.id);
    if (byId("shortWeek")) byId("shortWeek").onclick = () => { generatePlan(true); save().then(render); };
    if (byId("regen")) byId("regen").onclick = () => { generatePlan(); save().then(render); };
    document.querySelectorAll("[data-start]").forEach(btn => btn.onclick = () => startSession(btn.dataset.start));
    if (byId("okSet")) byId("okSet").onclick = () => logSet("yes", 0);
    if (byId("partialSet")) byId("partialSet").onclick = () => logSet("partial", 1);
    if (byId("painSet")) byId("painSet").onclick = () => logSet("stop", 3);
    if (byId("speakCue")) byId("speakCue").onclick = () => {
      const session = state.plan.find(s => s.id === state.active?.sessionId);
      const ex = exercises.find(e => e.id === session.exerciseIds[state.active.exerciseIndex]);
      speak(`${ex.name}. ${ex.cue}`);
    };
    if (byId("addWeight")) byId("addWeight").onclick = addWeight;
    if (byId("exportJson")) byId("exportJson").onclick = exportJson;
    if (byId("importJson")) byId("importJson").onchange = e => e.target.files[0] && importJson(e.target.files[0]);
    if (byId("tts")) byId("tts").onchange = e => { state.settings.tts = e.target.checked; save(); };
    if (byId("testVoice")) byId("testVoice").onclick = () => speak("ResurGo est prêt pour la séance.");
    if (byId("saveWorker")) byId("saveWorker").onclick = () => { state.settings.workerUrl = byId("workerUrl").value; state.settings.workerToken = byId("workerToken").value; save().then(render); };
    if (byId("testWorker")) byId("testWorker").onclick = testWorker;
    if (byId("reset")) byId("reset").onclick = async () => { if (confirm("Effacer les données locales ResurGo ?")) { state = structuredClone(defaultState); await save(); render(); } };
  }

  async function init() {
    state = (await dbGet("app")) || structuredClone(defaultState);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
    render();
  }

  init();
})();
