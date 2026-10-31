// Initialiser le socle applicatif partagé :
// constantes, helpers et début de bibliothèque d'exercices.
(() => {
  const APP_VERSION = "2.0.1", APP_BUILD = "2.0.1-web.65", DB = "resurgo-fitness-v1", STORE = "state", TODAY = new Date().toISOString().slice(0, 10);
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], el = id => document.getElementById(id);
  const uid = p => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const clone = v => typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const n = id => { const v = Number(el(id)?.value); return Number.isFinite(v) ? v : 0; };
  const num = id => { const raw = el(id)?.value; if (raw == null || raw === "") return null; const v = Number(raw); return Number.isFinite(v) ? v : null; };
  const text = id => el(id)?.value?.trim() || "";
  const sec = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const levels = { running:["R0","R1","R2","R3","R4"], push:["P0","P1","P2","P3","P4"], pull:["T0","T1","T2","T3","T4"], legs:["J0","J1","J2","J3","J4"], frontCore:["G0","G1","G2","G3","G4"], sideCore:["L0","L1","L2","L3","L4"], mobility:["M0","M1","M2","M3","M4"] };
  const levelNames = { running:"Course", push:"Poussée", pull:"Tirage", legs:"Jambes", frontCore:"Gainage face", sideCore:"Gainage côté", mobility:"Mobilité" };
  const levelText = {
    running:{R0:"Marche uniquement ou reprise très prudente",R1:"Alternance course-marche facile",R2:"Footing facile 20-30 min",R3:"Course régulière sans douleur",R4:"Course solide avec progression possible"},
    push:{P0:"Mur ou support très haut",P1:"Support haut facile",P2:"Pompes inclinées propres",P3:"Pompes genoux ou support bas",P4:"Pompes complètes propres"},
    pull:{T0:"Aucun tirage, mobilité seulement",T1:"Élastique léger",T2:"Rowing élastique propre",T3:"Tirage fort contrôlé",T4:"Tractions/rows avancés"},
    legs:{J0:"Chaise haute uniquement",J1:"Assis-debout contrôlé",J2:"Squat chaise propre",J3:"Fentes assistées",J4:"Unilatéral solide"},
    frontCore:{G0:"Respiration et dead bug très facile",G1:"Dead bug propre",G2:"Planche courte",G3:"Planche 45-60 s",G4:"Gainage avancé"},
    sideCore:{L0:"Respiration latérale",L1:"Gainage latéral genoux",L2:"Latéral court propre",L3:"Latéral complet",L4:"Variantes avancées"},
    mobility:{M0:"Raide/douloureux, amplitude faible",M1:"Mobilité douce",M2:"Mobilité correcte",M3:"Bonne amplitude",M4:"Très mobile et stable"}
  };
  const mood = [{face:"😣",label:"Alerte forte",tone:"bad"},{face:"😟",label:"Mauvais",tone:"bad"},{face:"😐",label:"Moyen -",tone:"warn"},{face:"🙂",label:"Correct",tone:"ok"},{face:"😊",label:"Bien",tone:"good"},{face:"😁",label:"Très bien",tone:"great"}];
  const videos = {
    defaultBase: "https://musclewiki.com",
    note: "Les vidéos sont online seulement. ResurGo Fitness intègre les URLs directes .mp4 ; les pages web d'exercices ne sont pas affichées car elles sont souvent bloquées par CSP."
  };
  const bodyMapAssets = { male:"./assets/bodymaps/male.svg", female:"./assets/bodymaps/female.svg" };
  globalThis.__resurgoExerciseDiagram = null;
  const familyLabels = { warmup:"Échauffement", core:"Gainage", push:"Poussée", pull:"Tirage", legs:"Jambes", knee_rehab:"Genou / kiné", mobility:"Mobilité", cardio:"Cardio", cooldown:"Retour au calme" };
  const ex = [
    E("warmup_flow","Échauffement mobilité","warmup","time",1,300,0,"Mobilité douce complète.",["Debout, respire par le nez.","Debout, mobilise chevilles, hanches, épaules.","Debout, garde une amplitude confortable."],"Pas de mouvement brutal.","/"),
    E("dead_bug","Dead bug","core","reps",3,8,40,"Gainage profond au sol.",["Allonge-toi sur le dos, genoux à 90 degrés.","Rentre légèrement les côtes.","Descends bras et jambe opposés sans cambrer.","Reviens lentement et alterne."],"Stop si douleur lombaire vive.","https://media.musclewiki.com/media/uploads/videos/branded/male-Recovery-dead-bugs-cross-lateral-front.mp4"),
    E("bird_dog","Bird-dog","core","reps",3,8,40,"Stabilité lombaire à quatre pattes.",["Mains sous épaules, genoux sous hanches.","Tends bras et jambe opposés.","Garde le bassin face au sol.","Marque une pause puis reviens."],"Stop si douleur qui descend dans la jambe.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bird-dog-side.mp4"),
    E("front_plank","Planche avant-bras","core","time",3,25,45,"Gainage frontal sans aller à l'échec.",["Au sol face au tapis, place les coudes sous épaules.","Au sol, garde les fesses ni hautes ni basses.","Au sol, respire lentement.","Arrête avant de perdre la forme."],"Stop si cambrure ou douleur lombaire.","https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-forearm-plank-side.mp4"),
    E("side_plank_knees","Gainage latéral genoux","core","time",2,25,35,"Stabilité latérale progressive.",["Au sol sur le côté, place le coude sous épaule.","Au sol, genoux fléchis et hanches alignées.","Au sol, pousse le tapis avec l'avant-bras.","Change de côté à chaque série."],"Stop si douleur épaule ou hanche.","https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-elbow-side-plank-front.mp4"),
    E("hollow_hold","Hollow hold facile","core","time",2,20,45,"Contrôle abdominal avancé mais modulable.",["Allongé sur le dos, plaque les lombaires au sol.","Au sol, garde les genoux fléchis au début.","Au sol, monte les bras seulement si le dos reste stable."],"Ne force pas si le dos se cambre.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-hollow-hold-front.mp4"),
    E("wall_pushup","Pompes inclinées hautes","push","reps",2,12,45,"Reprise très facile du mouvement de poussée sur support haut.",["Debout, mains sur un mur, un plan de travail ou un support très haut.","Debout incliné, garde le corps gainé en ligne.","Descends lentement vers le support.","Repousse sans verrouiller brutalement."],"Stop si douleur épaule.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bodyweight-elevated-push-up-side.mp4"),
    E("incline_pushup","Pompes inclinées","push","reps",3,10,60,"Pompes mains sur support haut.",["Debout incliné, mains sur table solide ou plan de travail.","Garde le corps en bloc.","Contrôle les coudes à 30-45 degrés.","Plus le support est bas, plus c'est dur."],"Support stable obligatoire.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bodyweight-elevated-push-up-side.mp4"),
    E("knee_pushup","Pompes inclinées basses","push","reps",3,8,60,"Progression vers les pompes complètes avec support plus bas.",["Debout incliné, mains sur un support stable plus bas qu'un plan de travail.","Garde le corps en bloc.","Descends poitrine vers le support.","Remonte sans casser les hanches."],"Stop si épaule douloureuse.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bodyweight-elevated-push-up-side.mp4"),
    E("pike_pushup","Pike push-up","push","reps",2,6,75,"Poussée épaules progressive.",["Au sol ou mains sur support, place les hanches hautes.","Descends la tête vers le sol.","Garde les coudes contrôlés.","Reste en amplitude partielle au début."],"Pas de douleur cervicale ou épaule.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-elevated-pike-press-side.mp4"),
    E("band_row","Rowing élastique","pull","reps",3,12,50,"Tirage horizontal posture.",["Debout ou assis, ancre l'élastique solidement.","Garde les épaules basses.","Tire les coudes vers l'arrière.","Reviens lentement."],"Vérifie l'ancrage avant chaque série.","https://media.musclewiki.com/media/uploads/videos/branded/male-Band-band-single-arm-row-side.mp4"),
    E("band_pulldown","Rowing vertical élastique","pull","reps",3,12,60,"Tirage vertical avec élastique pour épaules et haut du dos.",

["Debout, cale l'élastique sous les pieds ou sous un support stable.","Debout, tire les coudes vers le haut sans hausser les épaules.","Debout, garde les poignets sous les coudes.","Contrôle le retour."],"Charge légère et épaules basses.","https://media.musclewiki.com/media/uploads/videos/branded/male-Band-band-upright-row-front.mp4"),
    E("reverse_fly","Oiseau élastique","pull","reps",2,12,50,"Arrière d'épaule et posture.",["Debout, buste légèrement penché, bras presque tendus.","Ouvre doucement les bras.","Serre les omoplates sans cambrer.","Retour lent."],"Charge très légère.","https://media.musclewiki.com/media/uploads/videos/branded/male-band-rear-delt-fly-front.mp4"),
    E("sit_to_stand","Assis-debout chaise haute","legs","reps",3,12,60,"Base jambes avec repère de chaise, hors mode genou fragile.",["Debout devant une chaise haute, pieds largeur bassin.","Debout, recule les hanches vers la chaise.","Effleure la chaise sans t'écraser.","Remonte en poussant le sol."],"Évite cet exercice si l'état genou est à 3/5 ou moins.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bodyweight-box-squat-side.mp4"),
    E("box_squat","Squat sur chaise","legs","reps",3,10,60,"Squat sécurisé avec repère, hors mode genou fragile.",["Debout devant une chaise, recule les hanches.","Touche la chaise sans t'écraser.","Remonte en poussant les pieds.","Garde le buste long."],"Évite cet exercice si l'état genou est à 3/5 ou moins.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bodyweight-box-squat-side.mp4"),
    E("split_squat","Fente statique assistée","legs","reps",2,8,70,"Force unilatérale progressive, hors mode genou fragile.",["Debout en fente, tiens un support.","Descends verticalement avec petite amplitude.","Garde le genou avant aligné.","Remonte sans rebond."],"Évite cet exercice si l'état genou est à 3/5 ou moins.","https://media.musclewiki.com/media/uploads/videos/branded/male-bodyweight-split-squat-side.mp4"),
    E("glute_bridge","Pont fessier","legs","reps",3,12,45,"Fessiers et protection lombaire.",["Allongé sur le dos, pieds proches des fesses.","Pousse dans les talons.","Monte le bassin sans cambrer.","Redescends lentement."],"Pas de pincement lombaire.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-glute-bridge-side.mp4"),
    E("calf_raise","Montées mollets","legs","reps",3,15,45,"Mollets et tendon d'Achille.",["Debout, tiens un mur ou une chaise.","Monte sur pointes.","Marque une pause en haut.","Descends lentement."],"Stop si tendon douloureux.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-calf-raises-front.mp4"),
    E("hip_hinge","Charnière hanche","legs","reps",3,10,45,"Apprendre à plier aux hanches sans charger le genou.",["Debout, mains sur hanches.","Envoie les fesses vers l'arrière.","Garde le dos long.","Garde les genoux seulement légèrement fléchis."],"Pas de dos rond sous fatigue.","/"),
    E("quad_set","Contraction quadriceps genou","knee_rehab","time",3,20,25,"Activation douce du quadriceps pour soutenir la rotule.",["Allongé sur le dos ou assis jambes tendues, place une serviette sous le genou.","Écrase doucement la serviette avec l'arrière du genou.","Tiens la contraction sans bloquer la respiration.","Relâche lentement."],"Douleur maximale 2/5, sinon stop et avis kiné.","/"),
    E("straight_leg_raise","Lever de jambe tendue","knee_rehab","reps",2,10,45,"Renforcement quadriceps sans flexion profonde du genou.",["Allongé sur le dos, jambe gauche pliée et jambe droite tendue.","Contracte la cuisse droite en gardant le genou droit tendu.","Lève la jambe droite tendue jusqu'à l'alignement de la cuisse gauche.","Redescends la jambe droite lentement sans la laisser tomber.","À la deuxième série, change de jambe pour faire le même travail de l'autre côté."],"Stop si douleur genou, hanche ou dos.","/","https://www.verywellhealth.com/how-to-the-straight-leg-raise-2696526"),
    E("seated_knee_extension","Extension de genou assise limitée","knee_rehab","reps",2,10,45,"Quadriceps assis, amplitude courte et contrôlée.",["Assis sur une chaise, dos droit et pieds au sol.","Tends une jambe seulement jusqu'à une amplitude confortable.","Marque une pause courte sans verrouiller fort le genou.","Redescends lentement.","À la deuxième série, change de jambe pour rester équilibré entre les deux côtés."],"Reste en petite amplitude si la rotule tire.","/","https://www.verywellhealth.com/exercises-for-arthritic-knees-8648827"),
    E("standing_hamstring_curl","Flexion ischio debout","knee_rehab","reps",2,10,40,"Renforcement arrière de cuisse pour stabiliser le genou.",["Debout derrière une chaise, mains sur le dossier.","Plie un genou pour ramener le talon vers la fesse.","Garde les cuisses alignées et le bassin fixe.","Redescends lentement.","À la deuxième série, change de jambe pour rester équilibré entre les deux côtés."],"Amplitude douce, pas de crampe ni douleur vive.","/","https://www.verywellhealth.com/exercises-for-arthritic-knees-8648827"),
    E("clamshell","Coquillage côté","knee_rehab","reps",2,12,35,"Hanche et contrôle de l'alignement genou-rotule.",["Allongé sur le côté, genoux pliés et pieds ensemble.","Garde le bassin stable.","Ouvre le genou du dessus sans rouler en arrière.","Referme lentement.","À la deuxième série, change de côté pour rester équilibré entre les deux hanches."],"Le mouvement doit rester dans la hanche, pas dans le bas du dos.","/","https://www.verywellhealth.com/medial-knee-pain-exercises-5120563"),
    E("hip_abduction_side","Lever de jambe côté","knee_rehab","reps",2,10,40,"Moyen fessier pour mieux tenir l'axe du genou.",["Allongé sur le côté, jambe du dessous pliée et jambe du dessus tendue.","Garde les orteils légèrement vers l'avant.","Lève la jambe du dessus sans tourner le bassin.","Redescends lentement.","À la deuxième série, change de côté pour rester équilibré entre les deux hanches."],"Stop si douleur hanche ou lombaire.","/","https://www.verywellhealth.com/exercises-for-arthritic-knees-8648827"),
    E("hip_flexor","Mobilité psoas","mobility","time",2,35,20,"Ouverture de hanche.",["Au sol en fente basse, pose le genou arrière sur un coussin.","Rentre légèrement le bassin.","Respire lentement.","Change de côté."],"Ne force jamais, évite si le genou au sol est douloureux.","/bodyweight/male/stretching/hip-flexor-stretch"),
    E("thoracic_rotation","Rotation thoracique","mobility","reps",2,8,20,"Mobilité haut du dos.",["À quatre pattes, mains sous épaules.","Place une main derrière la tête.","Tourne le haut du dos sans bouger le bassin.","Regarde le coude."],"Pas de douleur vive.","https://media.musclewiki.com/media/uploads/videos/branded/male-Bodyweight-bodyweight-thoracic-spine-rotation-side.mp4"),
    E("ankle_wall","Étirement mollet au mur","mobility","time",2,35,20,"Étirement du mollet contre le mur.",["Debout face au mur, place les mains au mur.","Recule une jambe en gardant le talon au sol.","Avance doucement le bassin.","Change de côté."],"Tension douce, pas de douleur tendon.","https://media.musclewiki.com/media/uploads/videos/branded/male-Recovery-gastrocnemius-stretch-unilateral-on-wall-front.mp4"),
    E("hamstring_floss","Floss ischios","mobility","reps",2,10,20,"Souplesse arrière de jambe.",["Allongé sur le dos ou assis, allonge la jambe sans verrouiller.","Pointe puis fléchis le pied.","Garde une amplitude confortable.","Respire."],"Pas de tiraillement nerveux fort.","/"),
    E("shoulder_wall_slide","Étirement flexion épaule au mur","mobility","time",2,35,30,"Mobilité douce de l'épaule contre un mur.",["Debout face au mur, place une main ou les avant-bras au mur.","Avance doucement le buste pour ouvrir l'épaule.","Garde les côtes basses.","Respire sans forcer."],"Stop si pincement épaule.","https://media.musclewiki.com/media/uploads/videos/branded/male-Recovery-shoulder-flexion-stretch-wall-standing-side.mp4"),
    E("brisk_walk","Marche active","cardio","time",1,1800,0,"Cardio bas impact.",["Debout, pars sur terrain plat.","Garde un rythme où tu peux parler.","Utilise les bras sans te crisper.","Ralentis si douleur."],"Terrain plat si genou fragile, pas de côte forcée.","/"),
    E("easy_run","Course facile","cardio","time",1,1800,0,"Footing très facile autorisé en mode genou fragile si tout reste indolore.",["Debout, démarre très lentement sur terrain plat.","Garde une aisance où tu peux parler sans effort.","Reste en foulée courte et sans côte.","Stop si tendon, genou ou douleur irradiée."],"Genou fragile: plat, facile, sans fractionné, 45 min maximum.","/"),
    E("run_walk","Alternance course-marche","cardio","time",1,1500,0,"Marche-course progressive autorisée en mode genou fragile.",["Debout sur terrain plat, alterne 1-3 min course facile et marche.","Reste en aisance totale.","Note douleur et souffle.","Augmente seulement si tout va bien le lendemain."],"Genou fragile: plat, facile, sans côte, 45 min maximum.","/"),
    E("easy_bike","Vélo facile","cardio","time",1,1500,0,"Séance vélo en endurance douce à allure conversationnelle.",["Sur vélo stable ou sur piste sans difficulté, pédale en souplesse.","Reste à une intensité qui permet de parler en phrases complètes.","Réduis la résistance et fais une pause si une douleur apparaît.","Termine avec cinq minutes de pédalage très facile."],"Choisir un terrain plat ou un vélo intérieur si douleur ; ne pas forcer une articulation douloureuse.","/"),
    E("low_impact_cardio","Cardio bas impact","cardio","time",1,1500,0,"Vélo doux ou marche plate, sans impact.",["Assis sur vélo ou debout en marche plate, reste en zone facile.","Garde une cadence régulière.","Contrôle la respiration.","Finis avec la sensation de pouvoir continuer."],"Pas de côte, pas de step et pas de résistance lourde si genou fragile.","/"),
    E("step_up_low","Step-up bas","legs","reps",2,10,60,"Montée sur marche basse, hors mode genou fragile.",["Debout devant une marche basse et stable.","Monte en poussant dans le talon.","Redescends lentement.","Change de jambe."],"Évite cet exercice si l'état genou est à 3/5 ou moins.","https://media.musclewiki.com/media/uploads/videos/branded/male-Recovery-step-up-knee-drive-side.mp4"),
    E("cooldown_breathing","Retour au calme respiration","cooldown","time",1,180,0,"Retour au calme.",["Assis ou allongé, allonge l'expiration.","Relâche les épaules.","Observe douleur et fatigue.","Note le ressenti."],"Reste confortable.","/")
  ];
  const empty = {
    schemaVersion:"1.1.0-vanilla", activeProfileId:null, profiles:[], assessments:[], plans:[], sessionRuns:[], metrics:[], activities:[], exerciseVideos:{}, exerciseMetaOverrides:{},
    sources:[{id:"manual",label:"Manuel",enabled:true,priority:3},{id:"json_import",label:"Import JSON",enabled:true,priority:2},{id:"mock_garmin",label:"Mock Garmin",enabled:true,priority:1},{id:"worker",label:"Worker Cloudflare",enabled:false,priority:1}],
    settings:{ theme:"auto", hideInstallPrompt:false, notifications:{enabled:true,reminderTime:"08:00",lastNotifiedDate:"",askedOnInstall:false}, tts:{enabled:true,rate:1,pitch:1,volume:1,countdown:true,rest:true,cues:true,safetyAlways:true}, workerUrl:"", workerToken:"", videoBase:videos.defaultBase },
    ui:{ view:"today", search:"", searchDraft:"", filter:"all", message:"", modal:null }
  };
  let state = clone(empty), tick = null, left = 0, voiceSeq = 0, deferredInstallPrompt = null, swRegistration = null, updateWaiting = null, remoteVersion = APP_VERSION, remoteBuild = APP_BUILD, messageTimer = null, smileyDismissBound = false, reminderTimer = null;
  let bodyMapSvg = { male:"", female:"" };

  function exerciseMeta(id,family,type,sets,amount){
    const durationMin=type==="time"?Math.round((amount||0)/60):0;
    const rehab=family==="knee_rehab", mobility=family==="mobility"||family==="cooldown"||family==="warmup", cardio=family==="cardio";
    const heavyIds=["box_squat","split_squat","step_up_low"], lightIds=["quad_set","clamshell","hip_flexor","ankle_wall","hamstring_floss","cooldown_breathing","warmup_flow","brisk_walk","run_walk"];
    let load="moderate";
    if(mobility||rehab||lightIds.includes(id)) load="light";
    else if(heavyIds.includes(id)) load="hard";
    else if(cardio&&durationMin>=30) load="moderate";
    return {
      load,
      role:mobility?"mobility":rehab?"rehab":cardio?"cardio":"strength",
      compatibleAddon:mobility||rehab||lightIds.includes(id),
      recoveryCost:load==="hard"?2:load==="moderate"?1:0
    };
  }
  const trainingLoadOptions = ["light","moderate","hard"];
  const trainingRoleOptions = ["mobility","rehab","cardio","strength"];
  const trainingLabels = {
    load:{light:"Léger",moderate:"Normal",hard:"Dur"},
    role:{mobility:"Mobilité / étirement",rehab:"Rééducation / kiné",cardio:"Cardio",strength:"Renforcement"}
  };
  function effectiveTraining(x){
    const override=state.exerciseMetaOverrides?.[x.id]||{};
    return {...x.training,...override};
  }
  function E(id,name,family,type,sets,amount,rest,short,steps,safety,path,sourceUrl="") {
    return { id,name,family,type,sets,rest,short,steps,safety,cue:steps[0], reps:type==="reps"?amount:null, seconds:type==="time"?amount:null, videoPath:path, sourceUrl, training:exerciseMeta(id,family,type,sets,amount) };
  }
  function db(){ return new Promise((ok,ko)=>{ const r=indexedDB.open(DB,1); r.onupgradeneeded=()=>r.result.createObjectStore(STORE); r.onsuccess=()=>ok(r.result); r.onerror=()=>ko(r.error); }); }
  async function get(k)

  // Regrouper ici la logique métier de planification,
  // d'état persistant et de progression des séances.
{ const d=await db(); return new Promise((ok,ko)=>{ const r=d.transaction(STORE).objectStore(STORE).get(k); r.onsuccess=()=>ok(r.result); r.onerror=()=>ko(r.error); }); }
  async function put(k,v){ const d=await db(); return new Promise((ok,ko)=>{ const r=d.transaction(STORE,"readwrite").objectStore(STORE).put(v,k); r.onsuccess=ok; r.onerror=()=>ko(r.error); }); }
  async function save(msg=""){
    if (msg) {
      state.ui.message = msg;
      if (messageTimer) clearTimeout(messageTimer);
      messageTimer = setTimeout(async () => {
        if (state.ui.message === msg) {
          state.ui.message = "";
          await put("app", state);
          render();
        }
      }, 3000);
    }
    await put("app",state);
    nasSyncSchedule();
  }
  const profile=()=>state.profiles.find(p=>p.id===state.activeProfileId);
  function sessionSortValue(s){ return `${s.date||TODAY}-${s.secondary?"1":"0"}`; }
  const profilePlansFor=pid=>state.plans.filter(s=>s.profileId===pid).sort((a,b)=>sessionSortValue(a).localeCompare(sessionSortValue(b)));
  const profilePlans=()=>profile()?state.plans.filter(s=>s.profileId===profile().id).sort((a,b)=>sessionSortValue(a).localeCompare(sessionSortValue(b))):[];
  function activeWeekKeyForProfile(pid){ const all=profilePlansFor(pid), open=all.filter(s=>!s.completedAt); return (open[0]||all[all.length-1])?.weekStart||TODAY; }
  function activeWeekKey(){ const all=profilePlans(), open=all.filter(s=>!s.completedAt); return (open[0]||all[all.length-1])?.weekStart||TODAY; }
  const weekPlan=()=>profilePlans().filter(s=>(s.weekStart||s.date||TODAY)===activeWeekKey());
  const plan=()=>weekPlan().filter(s=>!s.completedAt);
  const run=()=>state.sessionRuns.find(r=>!r.completedAt&&!r.abortedAt);
  const exercise=id=>{ const base=ex.find(x=>x.id===id)||ex[0]; return base?{...base,training:effectiveTraining(base)}:ex[0]; };
  const currentEx=()=>{ const r=run(), s=state.plans.find(x=>x.id===r?.sessionId); return exercise(s?.exerciseIds[r.exerciseIndex]); };
  function timeValue(value){ const t=Date.parse(value||""); return Number.isFinite(t)?t:0; }
  function metricTime(m){ return timeValue(m?.measuredAt||m?.date||m?.createdAt); }
  function activityTime(a){ return timeValue(a?.startedAt||a?.date||a?.createdAt); }
  const latestMetric=()=>{ const p=profile(); const a=p?state.metrics.filter(m=>m.profileId===p.id&&m.weightKg).sort((a,b)=>metricTime(a)-metricTime(b)):[]; return a[a.length-1]||null; };
  function latestWeightEntry(p=profile()){
    if(!p) return null;
    const metrics=state.metrics.filter(m=>m.profileId===p.id&&m.weightKg).sort((a,b)=>metricTime(a)-metricTime(b));
    const metric=metrics[metrics.length-1]||null, profileWeight=Number(p.startWeightKg), profileTime=timeValue(p.createdAt);
    if(metric&&(!Number.isFinite(profileWeight)||profileWeight<=0||metricTime(metric)>=profileTime)) return {...metric,weightKg:Number(metric.weightKg),source:metric.source||"manual"};
    return Number.isFinite(profileWeight)&&profileWeight>0 ? {id:"profile_start",profileId:p.id,source:"profile",measuredAt:p.createdAt||"",weightKg:profileWeight} : null;
  }
  function currentWeightKg(p=profile()){ const entry=latestWeightEntry(p); return entry&&Number.isFinite(Number(entry.weightKg)) ? Number(entry.weightKg) : null; }
  const loadScore = id => { const raw = el(id)?.value; return raw === "" || raw == null ? null : scoreToLoad(Number(raw)); };
  const typeLabel=t=>({strength:"Musculation",cardio:"Course / cardio",mobility:"Mobilité",recovery:"Récupération",run:"Course",walk:"Marche",bike:"Vélo / cardio"}[t]||"Séance");
  const familyLabel=f=>familyLabels[f]||f;
  function weekWindowDays(p){ return Number(p.availabilityDays)===7 ? 7 : 5; }
  function kneeCare(p){ const load=Math.max(p.health.kneePain??0,p.health.tendonPain??0); return load>=2; }
  function protectionMode(p){ const pain=Math.max(p.health.backPain||0,p.health.kneePain||0,p.health.tendonPain||0); return p.health.irradiating||p.health.neurological||pain>=3||(p.health.fatigue||0)>=5; }
  function targetSessionCount(p, completed=[]){
    const windowDays=weekWindowDays(p), done=completed.length, pain=Math.max(p.health.backPain||0,p.health.kneePain||0,p.health.tendonPain||0), fatigue=p.health.fatigue||0;
    let target=3;
    if(windowDays===7) target++;
    if((currentWeightKg(p)||0)>0&&(Number(p.targetWeightKg)||0)>0&&(currentWeightKg(p)||0)>(Number(p.targetWeightKg)||0)) target++;
    if(p.levels.running==="R0"||p.levels.legs==="J0") target--;
    if(pain>=2||fatigue>=4) target--;
    if(pain>=3||fatigue>=5||p.health.irradiating||p.health.neurological) target=2;
    if(kneeCare(p)) target=Math.min(target,3);
    if(done>=3&&pain<=1&&fatigue<=2) target++;
    return Math.max(2,Math.min(windowDays===7?5:4,target));
  }
  function normalizeGoal(p){ const loss=(Number(p.startWeightKg)||0)-(Number(p.targetWeightKg)||0), minMonths=6, maxKgMonth=5, needed=loss>0?Math.ceil(loss/maxKgMonth):minMonths; p.targetMonths=Math.max(minMonths,needed,Math.round(Number(p.targetMonths)||minMonths)); p.availabilityDays=weekWindowDays(p); p.equipment="Poids du corps, chaise ou banc, élastique"; return p; }
  function goalInfo(p){ normalizeGoal(p); const current=currentWeightKg(p), target=Number(p.targetWeightKg)||0, loss=current&&target?current-target:0, needed=loss>0?Math.ceil(loss/5):6; p.targetMonths=Math.max(6,needed,Math.round(Number(p.targetMonths)||6)); const monthly=loss>0?loss/p.targetMonths:0; return {loss,monthly,months:p.targetMonths,currentWeightKg:current,targetWeightKg:target,text:loss>0?`${loss.toFixed(1)} kg restants en ${p.targetMonths} mois · ${monthly.toFixed(1)} kg/mois`:"Objectif maintien ou recomposition",safe:monthly<=5}; }
  function addDaysIso(base,days){ const d=new Date(`${base}T12:00:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
  function dayLabel(iso){ return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"2-digit"}); }
  function weekdayIndex(iso){ const day=new Date(`${iso}T12:00:00`).getDay(); return day===0?7:day; }
  function mondayOfWeek(iso){ return addDaysIso(iso,1-weekdayIndex(iso)); }
  function nextMonday(iso){ return addDaysIso(mondayOfWeek(iso),7); }
  function normalizeWeekAnchor(base,windowDays,next=false){
    if(windowDays===7) return base||TODAY;
    if(next) return nextMonday(base||TODAY);
    if(weekdayIndex(TODAY)>=6) return nextMonday(TODAY);
    return mondayOfWeek(base||TODAY);
  }
  function weekDates(anchor,windowDays){
    if(windowDays===7) return Array.from({length:7},(_,i)=>addDaysIso(anchor,i));
    const monday=mondayOfWeek(anchor);
    return Array.from({length:5},(_,i)=>addDaysIso(monday,i));
  }
  function weekEndDate(anchor,windowDays){ const dates=weekDates(anchor,windowDays); return dates[dates.length-1]||anchor; }
  function scheduleOffsets(days,windowDays=5){ const maps=windowDays===7?{1:[0],2:[0,3],3:[0,2,4],4:[0,2,4,6],5:[0,1,3,5,6]}:{1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,3,4]}; return maps[days]||maps[3]; }
  function weekAnchor(){ const items=weekPlan(); return items[0]?.weekStart||items[0]?.date||TODAY; }
  function weekAgenda(p){ const anchor=weekAnchor(), items=weekPlan().filter(s=>s.weekStart===anchor||!s.weekStart), byDate=new Map(); items.forEach(s=>{ const key=s.date||anchor; if(!byDate.has(key)) byDate.set(key,[]); byDate.get(key).push(s); }); return weekDates(anchor,weekWindowDays(p)).map(date=>({date,sessions:(byDate.get(date)||[]).sort((a,b)=>(a.secondary?1:0)-(b.secondary?1:0))})); }
  function dateDiffDays(a,b){ return Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000); }
  function remainingWeekDates(anchor,completed,windowDays=5){ const occupied=new Set(completed.map(s=>s.date)); return weekDates(anchor,windowDays).filter(d=>d>=TODAY&&!occupied.has(d)); }
  function isoDatePart(value){ return String(value||"").slice(0,10); }
  function activityPlanType(a){
    if(!a) return null;
    if(["strength","cardio","mobility"].includes(a.type)) return a.type;
    if(["run","bike"].includes(a.type)) return "cardio";
    if(a.type==="walk") return "mobility";
    return null;
  }
  function refreshPlanAfterActivity(pid,{short}={}){
    const p=state.profiles.find(x=>x.id===pid); if(!p) return;
    const existing=profilePlansFor(pid), activeKey=activeWeekKeyForProfile(pid), currentWeek=existing.filter(s=>(s.weekStart||s.date||TODAY)===activeKey), currentShort=short ?? !!currentWeek[0]?.short;
    makeWeek(pid,currentShort);
  }
  function ensurePlanCurrent(pid){
    const p=state.profiles.find(x=>x.id===pid); if(!p) return false;
    const existing=profilePlansFor(pid), activeKey=activeWeekKeyForProfile(pid), currentWeek=existing.filter(s=>(s.weekStart||s.date||TODAY)===activeKey);
    if(!currentWeek.length) return false;
    const open=currentWeek.filter(s=>!s.completedAt), currentShort=!!currentWeek[0]?.short, windowDays=weekWindowDays(p), anchor=currentWeek[0]?.weekStart||currentWeek[0]?.date||TODAY;
    const stale=dateDiffDays(weekEndDate(anchor,windowDays),TODAY)>0;
    const overdue=open.some(s=>(s.date||TODAY)<TODAY);
    if(!stale&&!overdue) return false;
    makeWeek(pid,currentShort);
    return true;
  }
  function recentActivityAnchor(pid,windowDays){
    const floor=windowDays===7?addDaysIso(TODAY,-6):mondayOfWeek(TODAY);
    const dates=state.activities.filter(a=>a.profileId===pid).map(a=>isoDatePart(a.startedAt||a.date||a.createdAt)).filter(date=>date&&date>=floor&&date<=TODAY).sort();
    return dates[0]||TODAY;
  }
  function planSessionDates(sets,availableDates){
    const dates=[...availableDates].sort(), picks=[];
    if(!dates.length||!sets.length) return picks;
    const used=new Set();
    for(let i=0;i<sets.length;i++){
      let chosen=null;
      for(let j=0;j<dates.length;j++){
        const date=dates[j];
        if(used.has(date)) continue;
        const previous=picks[picks.length-1], prevPrevious=picks[picks.length-2], futureSlots=dates.length-(j+1), futureNeed=sets.length-(i+1);
        const consecutive=previous&&dateDiffDays(previous.date,date)===1;
        const threeInRow=consecutive&&prevPrevious&&dateDiffDays(prevPrevious.date,previous.date)===1;
        const recoveryAfterPrev=consecutive&&previous&&previous.type!=="mobility";
        if((threeInRow||recoveryAfterPrev)&&futureSlots>=futureNeed) continue;
        chosen={date,type:sets[i].type};
        used.add(date);
        break;
      }
      if(!chosen){
        const fallback=dates.find(date=>!used.has(date));
        if(!fallback) break;
        chosen={date:fallback,type:sets[i].type};
        used.add(fallback);
      }
      picks.push(chosen);
    }
    return picks;
  }
  function sessionIntensity(exerciseIds,fallback="moderate"){
    const items=exerciseIds.map(exId=>exercise(exId)).filter(Boolean);
    if(items.some(x=>x.training?.load==="hard")) return "hard";
    if(items.every(x=>x.training?.load==="light")) return "light";
    return fallback;
  }
  function defineSession(title,minutes,type,exerciseIds,intensity="moderate",addonType=null){
    return {title,minutes,type,exerciseIds,intensity:sessionIntensity(exerciseIds,intensity),addonType};
  }
  function companionSessionFor(set){
    if(set.addonType==="mobility") return defineSession("Déverrouillage mobilité",12,"mobility",["hip_flexor","ankle_wall","cooldown_breathing"],"light",null);
    if(set.addonType==="light_strength") return defineSession("Renfo léger complémentaire",12,"strength",["warmup_flow","bird_dog","incline_pushup","cooldown_breathing"],"light",null);
    return null;
  }
  function canPairSameDay(primary,secondary){
    if(!primary||!secondary) return false;
    if(primary.intensity==="hard") return false;
    if(secondary.intensity!=="light") return false;
    if(primary.type==="cardio"&&secondary.type==="mobility") return true;
    if(primary.type==="strength"&&primary.intensity==="light"&&secondary.type==="mobility") return true;
    if(primary.type==="mobility"&&secondary.type==="strength") return true;
    return false;
  }
  function sessionOutcome(runState){
    const logs=runState?.logs||[];
    const hard=logs.some(l=>l.success!=="yes"||l.difficulty==="hard"||(l.pain||0)>=2);
    const stopped=logs.some(l=>l.success==="stop"||(l.pain||0)>=3);
    return {hard,stopped};
  }
  function applySessionFeedback(profileId,{easeScore,backScore,kneeScore,fatigueScore}={},runState=null){
    const p=state.profiles.find(x=>x.id===profileId); if(!p) return false;
    const backLoad=scoreToLoad(backScore), kneeLoad=scoreToLoad(kneeScore), fatigueLoad=scoreToLoad(fatigueScore), outcome=sessionOutcome(runState);
    if(backLoad!=null) p.health.backPain=backLoad;
    if(kneeLoad!=null){ p.health.kneePain=kneeLoad; p.health.tendonPain=kneeLoad; }
    if(fatigueLoad!=null) p.health.fatigue=fatigueLoad;
    const ease=Number.isFinite(Number(easeScore))&&Number(easeScore)>0 ? Number(easeScore) : 3;
    const needsLight=outcome.hard||outcome.stopped||ease<=2||(backLoad??0)>=3||(kneeLoad??0)>=3||(fatigueLoad??0)>=3;
    if(needsLight) refreshPlanAfterActivity(profileId,{short:true});
    return needsLight;
  }
  function todayPlannedSession(){ return plan().find(s=>(s.date||TODAY)===TODAY)||null; }
  function nextPlannedSession(){ return plan().find(s=>(s.date||TODAY)>=TODAY)||plan()[0]||null; }
  function frequencySummary(p){ const items=weekPlan(), windowDays=weekWindowDays(p), active=items.filter(s=>s.type!=="recovery"), done=items.filter(s=>s.completedAt).length, counts=active.reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},{}), rest=Math.max(0,windowDays-active.length); return [`Fenêtre ${windowDays} jours`,`${active.length} séances planifiées`,`${counts.strength||0} muscu`,`${counts.cardio||0} cardio`,`${counts.mobility||0} mobilité/kiné`,`${rest} repos`,`${done} fait`]; }
  function coachPickToday(p){
    const open=plan(); if(!open.length) return {session:null,rest:true,title:"Semaine terminée",reason:"Toutes les séances prévues sont faites. Repos ou marche douce."};
    const anchor=weekAnchor(), end=weekEndDate(anchor,weekWindowDays(p)), remainingDays=Math.max(1,dateDiffDays(TODAY,end)+1), today=todayPlannedSession(), overdue=open.filter(s=>(s.date||TODAY)<TODAY), pressure=open.length>=remainingDays;
    const pain=Math.max(p.health.backPain||0,p.health.kneePain||0,p.health.tendonPain||0), fatigue=p.health.fatigue||0, protect=protectionMode(p), knee=kneeCare(p);
    if(today&&!protect) return {session:today,rest:false,title:"Séance du jour",reason:"Elle est prévue aujourd'hui dans la semaine."};
    if(!today&&!overdue.length&&!pressure) return {session:null,rest:true,title:"Repos planifié",reason:`Il reste ${remainingDays} jours pour ${open.length} séance(s). Le repos garde la semaine équilibrée.`};
    const typeDone=weekPlan().filter(s=>s.completedAt).reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},{});
    const typeNeed={strength:0,cardio:0,mobility:0}; weekPlan().forEach(s=>{ if(typeNeed[s.type]!=null) typeNeed[s.type]++; });
    const score=s=>{
      let v=0;
      if((s.date||TODAY)<TODAY) v+=30;
      if((s.date||TODAY)===TODAY) v+=20;
      if(typeNeed[s.type]!=null) v+=(typeNeed[s.type]-(typeDone[s.type]||0))*8;
      if(knee&&s.title.toLowerCase().includes("genou")) v+=30;
      if(protect){ v+=s.type==="mobility"?35:s.type==="cardio"?8:-8; }
      else if(fatigue>=4){ v+=s.type==="mobility"?20:s.type==="strength"?-6:4; }
      else if(pain>=2){ v+=s.type==="mobility"?14:s.type==="cardio"?3:0; }
      if(s.type==="strength") v+=5;
      return v;
    };
    const picked=[...open].sort((a,b)=>score(b)-score(a))[0];
    const reason=knee?"Genou fragile: le coach évite squats, fentes, step et pliométrie, mais garde marche-course ou course très facile sur plat.":protect?"Protection prioritaire: le coach choisit la séance la plus récupératrice utile.":overdue.length?`Rattrapage: ${overdue.length} séance(s) en retard, le coach choisit la plus utile aujourd'hui.`:pressure?`Planning serré: ${open.length} séance(s) pour ${remainingDays} jour(s), le coach évite de perdre le fil.`:"Séance la plus utile pour équilibrer la semaine.";
    return {session:picked,rest:false,title:picked?.date===TODAY?"Séance du jour":"Séance conseillée par le coach",reason};
  }
  function notificationPermission(){ return "Notification" in window ? Notification.permission : "unsupported"; }
  function notificationStatusText(){
    if(!("Notification" in window)) return "Notifications non supportées par ce navigateur.";
    if(Notification.permission==="granted") return "Notifications autorisées.";
    if(Notification.permission==="denied") return "Notifications bloquées dans les réglages du navigateur.";
    return "Autorisation à demander.";
  }
  function todayReminderSession(){ const p=profile(); if(!p) return null; const pick=coachPickToday(p); return pick.rest?null:pick.session; }
  function reminderBody(s){ return s ? `Séance du jour :\n${s.title}` : "Aucune séance active aujourd'hui."; }
  async function updateAppBadge(){
    const s=todayReminderSession(), count=s?1:0;
    try{
      if(count&&navigator.setAppBadge) await navigator.setAppBadge(count);
      else if(navigator.clearAppBadge) await navigator.clearAppBadge();
    }catch{}
  }
  async function clearAppBadge(){ try{ if(navigator.clearAppBadge) await navigator.clearAppBadge(); }catch{} }
  async function showTodayNotification({force=false}={}){
    const s=todayReminderSession();
    if(!s||!("Notification" in window)||Notification.permission!=="granted") return false;
    if(!force&&state.settings.notifications.lastNotifiedDate===TODAY) return false;
    const title="ResurGo Fitness";
    const options={body:reminderBody(s),tag:`resurgo-session-${TODAY}`,renotify:force,icon:"./icon.svg",badge:"./icon.svg",data:{view:"today",sessionId:s.id,date:TODAY}};
    const reg=swRegistration||await navigator.serviceWorker?.ready.catch(()=>null);
    if(reg?.showNotification) await reg.showNotification(title,options);
    else new Notification(title,options);
    state.settings.notifications.lastNotifiedDate=TODAY;
    await updateAppBadge();
    await save();
    return true;
  }
  function nextReminderDelay(){
    const time=state.settings.notifications.reminderTime||"08:00", [h,m]=time.split(":").map(Number), d=new Date();
    d.setHours(Number.isFinite(h)?h:8,Number.isFinite(m)?m:0,0,0);
    if(d<=new Date()) d.setDate(d.getDate()+1);
    return Math.max(1000,d-new Date());
  }
  function scheduleSessionReminder(){
    if(reminderTimer) clearTimeout(reminderTimer);
    reminderTimer=null;
    updateAppBadge();
    if(!state.settings.notifications.enabled||!("Notification" in window)||Notification.permission!=="granted") return;
    reminderTimer=setTimeout(async()=>{ await showTodayNotification(); scheduleSessionReminder(); },nextReminderDelay());
  }
  async function requestSessionNotifications({test=true,silent=false,rerender=true}={}){
    if(!("Notification" in window)){ if(!silent) save("Notifications non supportées sur cet appareil.").then(()=>{ if(rerender) render(); }); return false; }
    const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
    state.settings.notifications.enabled=permission==="granted";
    if(permission==="granted"){
      state.settings.notifications.askedOnInstall=true;
      if(test) await showTodayNotification({force:true});
      await save(silent?"":test?"Notification envoyée.":"Rappels de séance activés.");
      if(rerender) render();
      return true;
    }
    state.settings.notifications.askedOnInstall=true;
    await save(silent?"":"Notifications refusées ou bloquées.");
    if(rerender) render();
    return false;
  }

  function createProfile(){
    const name = text("newProfileName") || `Profil ${state.profiles.length + 1}`;
    const p=normalizeGoal({
      id:uid("profile"),
      name,
      gender:el("newGender")?.value||"male",
      mediaGender:el("newMediaGender")?.value||"male",
      createdAt:new Date().toISOString(),
      age:num("newAge"),
      heightCm:num("newHeight"),
      startWeightKg:num("newWeight"),
      targetWeightKg:num("newTarget"),
      targetMonths:num("newTargetMonths")||6,
      availabilityDays:Number(el("newAvailabilityDays")?.value)===7?7:5,
      goalFocus:el("newGoalFocus")?.value||"global",
      equipment:"Poids du corps, chaise ou banc, élastique",
      sportsHistory:"",
      health:{
        backPain:loadScore("newProfileBack"),
        kneePain:loadScore("newProfileKnee"),
        tendonPain:loadScore("newProfileKnee"),
        fatigue:loadScore("newProfileFatigue"),
        irradiating:!!el("newIrradiating")?.checked,
        neurological:!!el("newNeurological")?.checked
      },
      levels:{
        running:el("newLevel_running")?.value||"R1",
        push:el("newLevel_push")?.value||"P1",
        pull:el("newLevel_pull")?.value||"T1",
        legs:el("newLevel_legs")?.value||"J1",
        frontCore:el("newLevel_frontCore")?.value||"G1",
        sideCore:el("newLevel_sideCore")?.value||"L1",
        mobility:el("newLevel_mobility")?.value||"M1"
      },
      dataPreferences:{primaryWeight:"garmin_index_s2",primaryActivities:"garmin",dedup:true}
    });
    state.profiles.push(p); state.activeProfileId=p.id; state.ui.modal=null; state.assessments.push({id:uid("assessment"),profileId:p.id,date:TODAY,tests:clone(p.levels)}); makeWeek(p.id); save("Profil créé.").then(render);
  }
  function makeWeek(pid,short=false,next=false){
    const p=state.profiles.find(x=>x.id===pid); if(!p) return; normalizeGoal(p);
    const protect=protectionMode(p), knee=kneeCare(p);
    const cardio=protect?"brisk_walk":(p.levels.running==="R0"||knee?"run_walk":"easy_run");
    const existing=profilePlansFor(pid), activeKey=activeWeekKeyForProfile(pid), currentWeek=existing.filter(s=>(s.weekStart||s.date||TODAY)===activeKey), currentAnchor=currentWeek[0]?.weekStart||currentWeek[0]?.date||TODAY, windowDays=weekWindowDays(p), staleWeek=!next&&currentWeek.length&&dateDiffDays(weekEndDate(currentAnchor,windowDays),TODAY)>0, resetAnchor=recentActivityAnchor(pid,windowDays);
    const completed=next||staleWeek?[]:currentWeek.filter(s=>s.completedAt).sort((a,b)=>new Date(`${a.date||TODAY}T12:00:00`)-new Date(`${b.date||TODAY}T12:00:00`));
    const lastWeek=Math.max(0,...existing.map(s=>Number(s.week)||0)), currentWeekNumber=currentWeek[0]?.week||lastWeek||1, rawAnchor=next?TODAY:staleWeek?resetAnchor:(completed[0]?.weekStart||currentWeek[0]?.weekStart||TODAY), anchor=normalizeWeekAnchor(rawAnchor,windowDays,next||staleWeek), weekNumber=next||staleWeek?lastWeek+1:currentWeekNumber;
    const days=targetSessionCount(p,completed);
    const kneeStrength=short?["warmup_flow","quad_set","straight_leg_raise","cooldown_breathing"]:["warmup_flow","quad_set","straight_leg_raise","seated_knee_extension","standing_hamstring_curl","cooldown_breathing"];
    const kneeStability=short?["clamshell","hip_abduction_side","cooldown_breathing"]:["warmup_flow","clamshell","hip_abduction_side","glute_bridge","calf_raise","cooldown_breathing"];
    const A=knee?kneeStrength:(short?["warmup_flow","dead_bug","bird_dog","sit_to_stand","cooldown_breathing"]:["warmup_flow","dead_bug","bird_dog","incline_pushup","band_row","sit_to_stand","glute_bridge","cooldown_breathing"]);
    const B=knee?kneeStability:(short?["hip_flexor","thoracic_rotation","bird_dog"]:["hip_flexor","ankle_wall","side_plank_knees","band_pulldown","box_squat","calf_raise"]);
    const C=short?["warmup_flow","low_impact_cardio","cooldown_breathing"]:["warmup_flow",cardio,"cooldown_breathing"];
    const D=knee?(short?["warmup_flow","incline_pushup","band_row","quad_set","cooldown_breathing"]:["warmup_flow","incline_pushup","band_row","quad_set","straight_leg_raise","cooldown_breathing"]):(short?["warmup_flow","incline_pushup","band_row","cooldown_breathing"]:["warmup_flow","incline_pushup","band_row","box_squat","side_plank_knees","cooldown_breathing"]);
    const E=short?["warmup_flow",knee&&!protect?"run_walk":"brisk_walk","cooldown_breathing"]:["warmup_flow",protect?"brisk_walk":knee?"easy_run":"low_impact_cardio","ankle_wall","cooldown_breathing"];
    const F=short?["hip_flexor","ankle_wall","cooldown_breathing"]:["hip_flexor","thoracic_rotation","ankle_wall","hamstring_floss","cooldown_breathing"];
    const G=short?["warmup_flow","thoracic_rotation","cooldown_breathing"]:["warmup_flow","thoracic_rotation","bird_dog","ankle_wall","cooldown_breathing"];
    // Une seule allocation multisport pour éviter les calendriers concurrents.
    // Les types restent 'strength/cardio/mobility' pour conserver l'historique.
    const strength1=defineSession(knee?"Renfo genou doux":"Force profonde",
      short?22:42,knee?"mobility":"strength",A,short?"light":"hard",null);
    const strength2=defineSession("Renforcement complet",short?24:40,
      "strength",D,short||knee?"light":"moderate",short?"mobility":null);
    const runEasy=defineSession(knee&&!protect?"Marche-course plate":
      protect?"Cardio protection":"Course facile",knee?30:protect?25:35,
      "cardio",C,protect||knee?"light":"moderate","mobility");
    const runSecond=defineSession("Endurance course / marche",short?22:30,
      "cardio",["warmup_flow",protect?"brisk_walk":knee?"run_walk":"easy_run",
        "cooldown_breathing"],"light","mobility");
    const bikeEasy=defineSession("Vélo en endurance facile",short?22:35,
      "cardio",["warmup_flow",protect?"brisk_walk":"easy_bike","cooldown_breathing"],
      "light","mobility");
    const bikeSecond=defineSession("Vélo souple de progression",short?24:40,
      "cardio",["warmup_flow",protect?"brisk_walk":"easy_bike",
        "ankle_wall","cooldown_breathing"],"light","mobility");
    const mobility=defineSession(knee?"Stabilité genou / rotule":"Renfo mobilité",
      short?18:34,"mobility",B,"light",null);
    const recovery=defineSession("Mobilité récupération",short?16:28,
      "mobility",F,"light",null);
    const activeRecovery=defineSession("Récupération active",short?14:24,
      "mobility",G,"light",null);
    const focus=["global","running","cycling","fitness","weight_loss","strength"]
      .includes(p.goalFocus)?p.goalFocus:"global";
    const agendas={
      global:[strength1,runEasy,mobility,strength2,bikeEasy,recovery,activeRecovery],
      running:[runEasy,strength1,runSecond,mobility,strength2,recovery,bikeEasy],
      cycling:[bikeEasy,strength1,bikeSecond,mobility,strength2,recovery,runEasy],
      fitness:[strength1,bikeEasy,mobility,runEasy,strength2,recovery,activeRecovery],
      weight_loss:[runEasy,strength1,bikeEasy,mobility,strength2,recovery,activeRecovery],
      strength:[strength1,mobility,strength2,runEasy,recovery,bikeEasy,activeRecovery]
    };
    // Si douleur/alerte, la sécurité prévaut sur la priorité sportive.
    const sets=(protect||knee?[
      strength1,runEasy,mobility,strength2,bikeEasy,recovery,activeRecovery
    ]:agendas[focus]).slice(0,days);
    const weekEnd=weekEndDate(anchor,windowDays);
    const extraActivities=next||staleWeek?[]:state.activities.filter(a=>a.profileId===pid&&!a.sessionRunId).filter(a=>{ const date=isoDatePart(a.startedAt||a.date||a.createdAt); return date>=anchor&&date<=weekEnd&&date<=TODAY; });
    const doneTypes=completed.reduce((a,s)=>{a[s.type]=(a[s.type]||0)+1; return a;},extraActivities.reduce((a,x)=>{ const type=activityPlanType(x); if(type) a[type]=(a[type]||0)+1; return a; },{}));
    const remainingSets=sets.filter(s=>{ if(doneTypes[s.type]>0){ doneTypes[s.type]--; return false; } return true; });
    const slotPlan=planSessionDates(remainingSets,remainingWeekDates(anchor,completed,windowDays));
    const fallbackDates=scheduleOffsets(Math.max(1,remainingSets.length),windowDays).map(offset=>weekDates(anchor,windowDays)[offset]||anchor);
    state.plans=state.plans.filter(s=>!(s.profileId===pid&&!s.completedAt));
    const planned=slotPlan.length?slotPlan.map((slot,i)=>({slot,set:remainingSets[i]})):remainingSets.slice(0,1).map((set,i)=>({slot:{date:fallbackDates[i]||TODAY,type:set.type},set}));
    const sessions=[];
    planned.forEach(({slot,set},i)=>{
      sessions.push({id:uid(`session${i}`),profileId:pid,title:set.title,minutes:set.minutes,type:set.type,phase:1,week:weekNumber,weekStart:anchor,date:slot.date,dayIndex:completed.length+i+1,exerciseIds:set.exerciseIds,short:set.intensity==="light",secondary:false,completedAt:null,intensity:set.intensity});
      const addon=companionSessionFor(set);
      if(addon&&canPairSameDay(set,addon)){
        sessions.push({id:uid(`session${i}_addon`),profileId:pid,title:addon.title,minutes:addon.minutes,type:addon.type,phase:1,week:weekNumber,weekStart:anchor,date:slot.date,dayIndex:completed.length+i+1,exerciseIds:addon.exerciseIds,short:true,secondary:true,completedAt:null,intensity:"light"});
      }
    });
    state.plans.push(...sessions);
  }
  function decision(p){
    const planned=state.plans.filter(s=>s.profileId===p.id), done=planned.filter(s=>s.completedAt).length, adh=planned.length?done/planned.length:0;
    const scores=[p.health.backPain,p.health.kneePain,p.health.tendonPain].filter(v=>v!=null);
    const pain=scores.length?Math.max(...scores):0;
    const fatigue=p.health.fatigue ?? 0;
    const hasCheck=scores.length>0||p.health.fatigue!=null||p.health.irradiating||p.health.neurological;
    if(!done && !hasCheck) return ["blue","Démarrage","Base installée. Renseigne le check rapide puis lance la première semaine."];
    if(p.health.irradiating||p.health.neurological||pain>=3||fatigue>=5) return ["red","Protection","Douleur ou fatigue élevée : priorité à la sécurité, au repos et à la mobilité."];
    if(adh<.4||fatigue>=4) return ["orange","Adaptation","Le coach allège automatiquement le volume et les exercices si la récupération est limite."];
    if(adh>=.65&&pain<=2&&fatigue<=3) return ["green","Progression","Semaine stable avec progression légère quand la récupération reste bonne."];
    return ["blue","Maintien","Répéter proprement sans chercher la performance."];
  }
  function start(id){ const s=state.plans.find(x=>x.id===id); if(!s) return; state.sessionRuns=state.sessionRuns.filter(x=>x.completedAt||x.abortedAt); state.sessionRuns.push({id:uid("run"),profileId:s.profileId,sessionId:s.id,exerciseIndex:0,setIndex:0,mode:"work",logs:[],safetyAlerts:[],startedAt:new Date().toISOString(),completedAt:null,abortedAt:null}); state.ui.view="session"; speakExerciseGuide(currentEx(),"Prochain exercice."); save("Séance lancée.").then(render); }
  function log(success,pain,difficulty){
    stopTimer(); const r=run(), s=state.plans.find(x=>x.id===r?.sessionId), x=currentEx(); if(!r||!s||!x) return;
    r.logs.push({exerciseId:x.id,set:r.setIndex+1,success,pain,difficulty,at:new Date().toISOString()});
    if(pain>=3){r.safetyAlerts.push(`${x.name}: douleur ${pain}/5`); speak("Alerte sécurité. Stop ou version plus facile.","safety");}
    const doneEx=pain>=3||success==="stop"||r.setIndex+1>=x.sets;
    if(doneEx&&r.exerciseIndex+1>=s.exerciseIds.length){
      r.completedAt=s.completedAt=new Date().toISOString(); r.mode="done";
      const activityId=uid("activity");
      state.activities.push({id:activityId,profileId:r.profileId,source:"session",type:s.type,startedAt:r.startedAt,durationSeconds:s.minutes*60,sessionRunId:r.id,plannedSessionId:s.id,sessionTitle:s.title,sessionEaseScore:null,quickBackScore:null,quickKneeScore:null,quickFatigueScore:null});
      state.ui.sessionFeedback={runId:r.id,activityId,profileId:r.profileId};
      state.ui.view="stats";
      state.ui.modal="sessionFeedback";
      speak("Séance terminée. Fais le check rapide et note le ressenti.");
    }
    else if(doneEx){r.mode="resting"; r.restNext={exerciseIndex:r.exerciseIndex+1,setIndex:0,label:`Exercice suivant : ${exercise(s.exerciseIds[r.exerciseIndex+1]).name}`}; startRest(x.rest||30);}
    else {r.mode="resting"; r.restNext={exerciseIndex:r.exerciseIndex,setIndex:r.setIndex+1,label:`Série suivante : ${r.setIndex+2} sur ${x.sets}`}; startRest(x.rest||30);}
    save("Résultat enregistré.").then(render);
  }
  function voiceUtterance(t,done){ const u=new SpeechSynthesisUtterance(t); u.lang="fr-FR"; u.rate=state.settings.tts.rate; u.pitch=state.settings.tts.pitch; u.volume=state.settings.tts.volume; if(done) u.onend=done; return u; }
  function speak(t,kind="cue"){ if((!state.settings.tts.enabled&&kind!=="safety")||!("speechSynthesis" in window)) return; if(kind==="safety"){ voiceSeq++; speechSynthesis.cancel(); } speechSynthesis.speak(voiceUtterance(t)); }
  function speakSequence(parts,kind="cue",gap=650){ if((!state.settings.tts.enabled&&kind!=="safety")||!("speechSynthesis" in window)) return; const list=parts.map(x=>String(x||"").trim()).filter(Boolean); if(!list.length) return; const token=++voiceSeq; speechSynthesis.cancel(); let i=0; const next=()=>{ if(token!==voiceSeq||i>=list.length) return; speechSynthesis.speak(voiceUtterance(list[i++],()=>setTimeout(next,gap))); }; next(); }
  function speakExerciseGuide(x,prefix=""){ if(!x||!state.settings.tts.cues) return; const parts=[`${prefix} ${x.name}. ${x.short}`,...x.steps.map((s,i)=>`Consigne ${i+1}. ${s}`),`Sécurité. ${x.safety}`]; speakSequence(parts,"cue",650); }
  function startTimer(){ const x=currentEx(); if(!x) return; if(x.type!=="time"){speakExerciseGuide(x,"Rappel."); return

  // Centraliser ici les helpers d'interface transverses :
  // timer, thème, PWA, notifications et contrôles de ressenti.
;} stopTimer(); left=x.seconds; updateTimer(); speak("Timer lancé."); tick=setInterval(()=>{ left--; if(state.settings.tts.countdown&&[10,5,3,2,1].includes(left)) speak(String(left),"timer"); updateTimer(); if(left<=0){stopTimer(); speak("Temps terminé. Enregistre le résultat.");}},1000); }
  function startRest(seconds){ stopTimer(); left=seconds; if(state.settings.tts.rest) speak(`Repos ${seconds} secondes. La prochaine série ne démarre pas automatiquement.`,"timer"); tick=setInterval(()=>{ left--; if(state.settings.tts.countdown&&[30,20,10,5,3,2,1].includes(left)) speak(left===30||left===20||left===10?`${left} secondes` : String(left),"timer"); updateTimer(); if(left<=0){stopTimer(); speak("Repos terminé. Appuie sur commencer quand tu es prêt.","timer"); render();}},1000); }
  function continueAfterRest(){ const r=run(); if(!r?.restNext) return; r.exerciseIndex=r.restNext.exerciseIndex; r.setIndex=r.restNext.setIndex; r.mode="work"; r.restNext=null; left=0; speakExerciseGuide(currentEx(),"Prêt."); save("Série suivante prête.").then(render); }
  function stopTimer(){ if(tick) clearInterval(tick); tick=null; }
  function updateTimer(){ const t=el("timer"); if(t) t.textContent=sec(Math.max(left,0)); }
  function applyTheme(){ document.documentElement.dataset.theme=state.settings.theme||"auto"; }
  function isStandalone(){ return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone; }
  function pwaPrompt(){
    if(isStandalone()) return "";
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
    if(deferredInstallPrompt) return `<div class="pwaPrompt"><div><strong>Installer ResurGo Fitness</strong><span>Ajoute l'app à l'écran d'accueil pour un usage plein écran et offline.</span></div><button class="primary" id="installPwa">Installer</button><button class="secondary" id="dismissPwa">Plus tard</button></div>`;
    if(ios) return `<div class="pwaPrompt"><div><strong>Installer ResurGo Fitness</strong><span>Sur iPhone/iPad : Partager, puis “Sur l'écran d'accueil”.</span></div><button class="secondary" id="dismissPwa">OK</button></div>`;
    return "";
  }
  function updatePrompt(){ return remoteBuild!==APP_BUILD||remoteVersion!==APP_VERSION||updateWaiting ? `<div class="pwaPrompt update"><div><strong>Mise à jour ${esc(remoteVersion)} détectée</strong><span>Installation automatique en cours. Les données locales sont conservées.</span></div></div>` : ""; }
  function healthScore(v){ return v == null || v === "" ? null : Math.max(0,Math.min(5,5-Number(v))); }
  function scoreToLoad(v){ return v == null || v === "" || Number.isNaN(Number(v)) ? null : Math.max(0,Math.min(5,5-Number(v))); }
  function bodyStateItems(kind,p){
    const kneeScore=healthScore(p.health.kneePain == null && p.health.tendonPain == null ? null : Math.max(p.health.kneePain ?? 0,p.health.tendonPain ?? 0));
    return kind==="quick"
      ? [{id:"quickBack",label:"Dos",score:healthScore(p.health.backPain)},{id:"quickKnee",label:"Genoux / Tendons",score:kneeScore},{id:"quickFatigue",label:"Énergie / Fatigue",score:healthScore(p.health.fatigue)}]
      : kind==="newProfile"
      ? [{id:"newProfileBack",label:"Dos",score:healthScore(p.health.backPain)},{id:"newProfileKnee",label:"Genoux / Tendons",score:kneeScore},{id:"newProfileFatigue",label:"Énergie / Fatigue",score:healthScore(p.health.fatigue)}]
      : [{id:"profileBack",label:"Dos",score:healthScore(p.health.backPain)},{id:"profileKnee",label:"Genoux / Tendons",score:kneeScore},{id:"profileFatigue",label:"Énergie / Fatigue",score:healthScore(p.health.fatigue)}];
  }
  function bodyStateControls(kind,p,extraClass="quickSmiley"){ return `<div class="smileyGrid ${extraClass}">${bodyStateItems(kind,p).map(x=>ratingControl(x.id,x.label,x.score)).join("")}</div>`; }
  function ratingControl(id,label,score){
    const blank=score == null || score === "", safe=blank ? "" : Math.max(0,Math.min(5,Number(score))), m=blank ? {face:"◯",label:"Non renseigné",tone:"empty"} : (mood[safe]||mood[0]);
    return `<div class="smileyField ${m.tone}" data-smiley="${id}"><span>${esc(label)}</span><input type="hidden" id="${id}" value="${blank?"":safe}"><details><summary><b>${m.face}</b><small>${blank?"--/5":`${safe}/5`}</small></summary><div class="smileyChoices">${mood.map((x,i)=>`<button type="button" class="${x.tone} ${i===safe?"selected":""}" data-rate-target="${id}" data-rate-value="${i}" title="${i}/5 - ${esc(x.label)}"><b>${x.face}</b><span>${i}/5</span></button>`).join("")}</div></details></div>`;
  }
  function levelOptions(k,value){ return levels[k].map(v=>`<option value="${v}" ${value===v?"selected":""}>${v} - ${esc(levelText[k][v])}</option>`).join(""); }
  function levelHelp(){ return `<details class="levelHelp"><summary>Comment choisir les tests initiaux ?</summary><div class="helpGrid">${Object.keys(levelNames).map(k=>`<div><strong>${levelNames[k]}</strong><p>${levels[k].map(v=>`${v}: ${levelText[k][v]}`).join(" · ")}</p></div>`).join("")}</div></details>`; }

  function shell(content){ const unreadCount=pushInboxItems.filter(x=>!x.read).length, unreadLabel=unreadCount?`${unreadCount} notification${unreadCount>1?"s":""} non lue${unreadCount>1?"s":""}`:"Consulter les notifications"; const nav=["today","plan","session","exercises","stats","settings"]; const names={today:"Aujourd'hui",plan:"Plan",session:"Séance",exercises:"Exos",stats:"Stats",settings:"Réglages"}, icons={today:"⌂",plan:"▦",session:"▶",exercises:"◉",stats:"◷",settings:"⚙"}, notice=[updatePrompt(),state.settings.hideInstallPrompt?pwaPrompt().replace("pwaPrompt","pwaPrompt hidden"):pwaPrompt(),state.ui.message?`<p class="notice toastNotice">${esc(state.ui.message)}</p>`:""].join(""); return `<main class="app"><div class="fixedShell"><header class="top"><div class="brand"><img class="logo" src="./icon.svg" alt="ResurGo Fitness"><div class="brandLabel"><span>ResurGo Fitness</span><small class="brandVersion">v${APP_VERSION} · ${navigator.onLine?"En ligne":"Hors ligne"}</small></div></div><div class="topActions"><button class="notificationButton" id="pushInboxButton" type="button" aria-label="${unreadLabel}" title="Notifications reçues"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span class="notificationCount"${unreadCount?"":" hidden"}>${unreadCount>99?"99+":unreadCount}</span></button></div></header></div><nav class="tabs">${nav.map(v=>`<button class="tab ${state.ui.view===v?"active":""}" data-view="${v}"><span>${icons[v]}</span><span>${names[v]}</span></button>`).join("")}</nav><div class="toastLayer">${notice}</div><section class="content">${content}</section>${modalLayer()}</main>`; }
  function today(){ const p=profile(); if(!p) return `<section class="hero"><p class="eyebrow">Coach sportif local-first</p><h1>ResurGo Fitness</h1><p>PWA offline avec séances guidées, exercices détaillés, stats, saisie course/balance et Worker Garmin optionnel.</p>${newProfileBox()}</section>`; const d=decision(p), w=latestWeightEntry(p), g=goalInfo(p), pick=coachPickToday(p), s=pick.session, next=nextPlannedSession(), done=!plan().length&&weekPlan().length; return `<section class="grid"><h1>Aujourd'hui</h1><article class="panel"><h2>Coach course et vélo</h2><p class="muted">Guidage GPS extérieur local, gestion prudente des côtes et récupération, voix prégénérées si disponibles.</p><button class="primary" id="openLiveCoach">Ouvrir le coach en direct</button><p class="muted">GPS en arrière-plan non garanti sur iOS PWA ; intérieur uniquement avec machine réellement connectée.</p></article><div class="grid two todayMain"><article class="panel"><p class="eyebrow">Profil actif</p><h2>${esc(p.name)}</h2><div class="row"><span>Objectif</span><strong>${g.currentWeightKg||p.startWeightKg||"?"} → ${p.targetWeightKg||"?"} kg</strong></div><div class="row"><span>Cadence cible</span><strong>${esc(g.text)}</strong></div><div class="row"><span>Poids récent</span><strong>${w?w.weightKg+" kg":"À saisir"}</strong></div><div class="row coachOrientation"><span>Orientation du coach</span><strong class="status ${d[0]}">${d[1]}</strong></div><p class="muted">${d[2]}</p><div class="actions compactActions twoButtons"><button class="secondary" id="openMetricModal">Ajouter pesée</button><button class="secondary" id="openActivityModal">Ajouter activité</button></div></article><article class="panel quickPanel"><h2>Check rapide</h2><p class="muted">5 = tout va bien, 0 = alerte rouge.</p>${bodyStateControls("quick",p,"quickSmiley")}</article><article class="panel todaySession ${s?"":"restDay"}"><p class="eyebrow">${esc(pick.title)}</p><h2>${s?esc(s.title):"Repos"}</h2><p class="muted">${s?`${dayLabel(s.date||TODAY)} · ${typeLabel(s.type)} · ${s.minutes} min · ${s.exerciseIds.length} blocs`:(next?`Prochaine séance : ${dayLabel(next.date||TODAY)} · ${next.title}`:"Aucune séance active.")}</p><p class="muted">${esc(pick.reason)}</p><div class="actions">${s?`<button class="primary" id="startToday">Démarrer</button>`:""}${done?`<button class="primary" id="nextWeek">Semaine suivante</button>`:""}<button class="secondary" id="goPlan">Voir la semaine</button><button class="secondary" id="activeRest">Repos actif</button></div></article></div><p class="notice">Sécurité : stop en cas de douleur irradiée, faiblesse, engourdissement, douleur forte ou symptôme inquiétant.</p></section>`; }
  function planView(){ if(!profile()) return needProfile(); const p=profile(), items=weekPlan(), agenda=weekAgenda(p), pick=coachPickToday(p), done=!plan().length&&items.length; return `<section class="grid"><h1>Plan adaptatif</h1><article class="panel planSummary"><h2>Semaine ${items[0]?.week||1}</h2><div class="chips">${frequencySummary(p).map(x=>`<span>${esc(x)}</span>`).join("")}</div>${pick.session?`<p class="muted">Aujourd'hui le coach conseille : ${esc(pick.session.title)}. ${esc(pick.reason)}</p>`:`<p class="muted">Aujourd'hui le coach conseille : repos. ${esc(pick.reason)}</p>`}<div class="actions">${done?`<button class="primary" id="nextWeek">Générer semaine suivante</button>`:""}<button class="secondary" id="regenPlan">Recalculer le plan</button></div></article><div class="weekAgenda">${agenda.map(d=>d.sessions?.length?`<article class="panel dayCard ${d.sessions.every(s=>s.completedAt)?"doneDay":""}"><p class="eyebrow">${dayLabel(d.date)} · ${d.sessions.length} bloc${d.sessions.length>1?"s":""}</p>${d.sessions.map(s=>`<div class="sessionStack ${s.secondary?"secondaryStack":""}"><h2>${esc(s.title)}</h2><p class="muted">${typeLabel(s.type)} · ${s.minutes} min · ${s.exerciseIds.length} blocs${s.secondary?" · complément léger":""}</p><div class="chips">${s.exerciseIds.map(id=>`<span>${exercise(id).name}</span>`).join("")}</div>${s.completedAt?`<span class="status green">Terminé</span>`:`<button class="primary" data-start="${s.id}">Lancer</button>`}</div>`).join("")}</article>`:`<article class="panel dayCard restDay"><p class="eyebrow">${dayLabel(d.date)}</p><h2>Repos</h2><p class="muted">Récupération, marche douce possible si tu veux bouger.</p></article>`).join("")}</div></section>`; }

  // Rassembler ici les vues de navigation principales :
  // accueil, plan, séance et bibliothèque.
  function sessionView(){ const r=run(); if(!r) return `<section class="grid"><h1>Séance</h1><article class="panel"><p>Aucune séance en cours.</p><button class="primary" id="startToday">Lancer la prochaine séance</button></article></section>`; const s=state.plans.find(x=>x.id===r.sessionId), x=currentEx(), logs=r.logs.filter(l=>l.exerciseId===x.id), done=logs.length, pct=Math.round(done/x.sets*100), currentSet=Math.min(done+1,x.sets); if(r.mode==="resting") return `<section class="session rest"><article class="panel coach workoutCoach"><p class="eyebrow">${s.title} · récupération</p><h1>Repos</h1><div class="timer restTimer" id="timer">${sec(Math.max(left,0))}</div><p class="muted">${esc(r.restNext?.label||"Série suivante")}</p><div class="coachCue"><strong>Reprise manuelle</strong><span>Respire, bois une gorgée si besoin, vérifie douleur et technique. La suite démarre quand tu appuies.</span></div><div class="actions"><button class="primary" id="continueAfterRest">Commencer quand je suis prêt</button><button class="secondary" id="skipRest">Passer le repos</button><button class="danger" id="abortSession">Abandonner</button></div></article></section>`; return `<section class="session"><div class="media sessionMedia">${media(x,true)}</div><article class="panel coach workoutCoach"><p class="eyebrow">${s.title} · exercice ${r.exerciseIndex+1}/${s.exerciseIds.length}</p><h1>${x.name}</h1><div class="workoutMeta"><span>${x.type==="time"?sec(x.seconds):`${x.reps} reps`}</span><span>${x.sets} séries</span><span>${x.rest||0}s repos</span></div><div class="setbox premiumSet"><div><strong>Série ${currentSet} / ${x.sets}</strong><span>${pct}% terminé</span></div><progress max="${x.sets}" value="${done}"></progress></div><div class="coachCue"><strong>Objectif</strong><span>${x.short}</span></div><details class="cueDetails"><summary>Consignes, sécurité et zones</summary>${targetPanel(x)}<ol>${x.steps.map(v=>`<li>${esc(v)}</li>`).join("")}</ol><p class="notice">${x.safety}</p></details><div class="timer" id="timer">${x.type==="time"?sec(left||x.seconds):`${x.reps} reps`}</div><div class="actions sessionActions"><button class="primary" id="startTimer">${x.type==="time"?"Lancer timer":"Lire consignes"}</button><button class="primary" id="okSet">Réussi</button><button class="secondary" id="partialSet">Dur</button><button class="danger" id="painSet">Stop</button><button class="secondary" id="speakCue">Voix</button><button class="danger" id="abortSession">Quitter</button></div></article></section>`; }
  function exercisesView(){ const f=state.ui.filter, q=(state.ui.search||"").toLowerCase(), draft=state.ui.searchDraft ?? state.ui.search ?? "", fam=[...new Set(ex.map(x=>x.family))], list=ex.filter(x=>(f==="all"||x.family===f)&&`${x.name} ${familyLabel(x.family)} ${x.short} ${x.steps.join(" ")}`.toLowerCase().includes(q)); return `<section class="grid"><h1>Bibliothèque</h1><div class="panel"><form class="searchForm compactSearch" id="exerciseSearchForm"><label>Recherche<input id="searchDraft" type="search" value="${esc(draft)}" placeholder="genou, dos, pompe, course..." autocomplete="off" enterkeyhint="search"></label></form><div class="grid two"><label>Famille<select id="familyFilter"><option value="all">Toutes</option>${fam.map(x=>`<option value="${x}" ${f===x?"selected":""}>${familyLabel(x)}</option>`).join("")}</select></label><p class="muted">${list.length} exercices · vidéo online, fiche et animation offline</p></div></div><div class="exerciseGrid">${list.map(card).join("")}</div></section>`; }
  function statsValue(v, suffix=""){ return v||v===0 ? `${v}${suffix}` : "--"; }
  function lastRun(acts){ return [...acts].reverse().find(a=>["run","walk","bike","cardio"].includes(a.type))||null; }
  function paceLabel(a){ if(!a?.durationSeconds||!a?.distanceKm) return "--"; const secKm=a.durationSeconds/a.distanceKm; return `${Math.floor(secKm/60)}:${String(Math.round(secKm%60)).padStart(2,"0")}/km`; }
  function gauge(value, color="var(--blue)"){ const v=Math.max(0,Math.min(100,Number(value)||0)); return `<svg class="gauge" viewBox="0 0 120 88" aria-hidden="true"><path d="M20 72 A40 40 0 0 1 100 72" pathLength="100" fill="none" stroke="var(--gauge-track)" stroke-width="10" stroke-linecap="round"/><path d="M20 72 A40 40 0 0 1 100 72" pathLength="100" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${v} 100" stroke-linecap="round"/><text x="60" y="70" text-anchor="middle" fill="var(--ink)" font-size="22" font-weight="900">${Math.round(v)}</text></svg>`; }
  function spark(rows,key,color="var(--blue)"){ const vals=rows.map(r=>Number(r[key])).filter(Number.isFinite); if(vals.length<2) return "<p class='metricEmpty'>Pas assez de données</p>"; const min=Math.min(...vals), max=Math.max(...vals), pts=vals.map((v,i)=>`${8+i*104/(vals.length-1)},${54-((v-min)/Math.max(1,max-min))*42}`).join(" "); return `<svg class="spark" viewBox="0 0 120 64" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${8+(vals.length-1)*104/(vals.length-1)}" cy="${54-((vals[vals.length-1]-min)/Math.max(1,max-min))*42}" r="4" fill="${color}"/></svg>`; }
  function metricCard(o){ return `<article class="metricCard ${o.cardClass||""} ${o.tall?"metricTall":""} ${o.clickable?"metricClickable":""}" ${o.attrs||""}><div class="metricHead"><span class="metricIcon" style="color:${o.color||"var(--blue)"}">${o.icon}</span><h2>${o.title}</h2>${o.action||""}</div>${o.visual||""}<div class="metricValue ${o.valueClass||""}">${o.value}</div>${o.sub?`<p class="metricSub ${o.subClass||""}">${o.sub}</p>`:""}${o.foot?`<p class="metricFoot ${o.footClass||""}">${o.foot}</p>`:""}</article>`; }

  // Porter ici les vues secondaires les plus denses :
  // statistiques détaillées, modales et réglages.
  function readinessLabel(v){ return v>=75?["Haute","Séance prévue possible."]:v>=50?["Correcte","Reste facile."]:["Protection","Volume réduit."]; }
  function hrZones(max){ const m=Number(max)||190; return [{label:"Z1 facile",value:`${Math.round(m*.50)}-${Math.round(m*.60)} bpm`},{label:"Z2 endurance",value:`${Math.round(m*.60)}-${Math.round(m*.70)} bpm`},{label:"Z3 soutenu",value:`${Math.round(m*.70)}-${Math.round(m*.80)} bpm`},{label:"Z4 dur",value:`${Math.round(m*.80)}-${Math.round(m*.90)} bpm`}]; }
  function shortDate(value){ return new Date(value||`${TODAY}T12:00:00.000Z`).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"}); }
  function dateTimeLabel(value){ return new Date(value||Date.now()).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).replace(",", ""); }
  function chartViewport(key,total){ const stored=state.ui.chartViewport?.[key]||{}, size=Math.max(2,Math.min(total||2,Number(stored.window)||Math.min(total||12,12))), maxOffset=Math.max(0,(total||0)-size), offset=Math.max(0,Math.min(maxOffset,Number(stored.offset)||0)); return {size,offset,maxOffset}; }
  function visibleRows(key,rows){ const {size,offset,maxOffset}=chartViewport(key,rows.length); return {rows:rows.slice(offset,offset+size),size,offset,maxOffset}; }
  function chartControls(key,total){ return ""; }
  function scoreSelect(id,value,{min=0,max=5,labelPrefix=""}={}){ return `<select id="${id}" class="historyInlineInput historyInlineSelect historyInlineSelectScore">${Array.from({length:max-min+1},(_,i)=>{ const score=min+i; return `<option value="${score}" ${Number(value)===score?"selected":""}>${labelPrefix}${score}/5</option>`; }).join("")}</select>`; }
  function activityTitle(r){ return r.sessionRunId ? (r.sessionTitle||typeLabel(r.type)) : typeLabel(r.type); }
  function activitySummary(r){ const parts=[]; if(Number(r.distanceKm)>0) parts.push(statsValue(r.distanceKm," km")); if(Number(r.durationSeconds)>0) parts.push(sec(Math.round(r.durationSeconds))); if(Number(r.hrAvg)>0) parts.push(`FC ${statsValue(r.hrAvg," bpm")}`); if(r.sessionRunId&&Number(r.sessionEaseScore)>0) parts.push(`Ressenti ${r.sessionEaseScore}/5`); return parts.join(" · ")||"Aucun détail"; }
  function latestActivityEntry(rows){ return rows.slice().sort((a,b)=>activityTime(a)-activityTime(b)).at(-1)||null; }
  function isCardioActivity(a){ return ["run","walk","bike","cardio"].includes(a?.type); }
  function cardioVolumeRows(rows){
    const byDate=new Map();
    rows.filter(a=>isCardioActivity(a)).forEach(a=>{
      const date=String(a.startedAt||a.date||a.createdAt||`${TODAY}T12:00:00.000Z`).slice(0,10), key=`${date}T12:00:00.000Z`, item=byDate.get(date)||{id:`cardio_${date}`,startedAt:key,distanceKm:0,durationMin:0};
      if(Number(a.distanceKm)>0) item.distanceKm=Number((item.distanceKm+Number(a.distanceKm)).toFixed(2));
      if(Number(a.durationSeconds)>0) item.durationMin=Number((item.durationMin+(Number(a.durationSeconds)/60)).toFixed(1));
      byDate.set(date,item);
    });
    return [...byDate.values()].sort((a,b)=>activityTime(a)-activityTime(b));
  }
  function latestMetricValue(p,key){
    return metricRowsFor(p,key).at(-1)?.[key] ?? null;
  }
  function cardioPointLabel(r){ const parts=[]; if(Number(r.distanceKm)>0) parts.push(`${statsValue(r.distanceKm," km")}`); if(Number(r.durationMin)>0) parts.push(`${statsValue(r.durationMin," min")}`); return `${shortDate(r.startedAt)} · ${parts.join(" · ")||"Cardio"}`; }
  function metricHistoryRows(rows){ const edit=state.ui.recordEdit; return rows.slice().sort((a,b)=>metricTime(b)-metricTime(a)).map(r=>{ const token=r.id, isEdit=edit?.kind==="metric"&&edit.id===token, label=r.metricLabel||metricLabels[r.metricKey]||"Mesure", unit=r.metricUnit??metricUnits[r.metricKey]??"", value=r.metricDisplayValue??metricValue(r,r.metricKey); return isEdit?`<article class="historyRow historyRowEditing"><div class="historyMeta historyInlineEditor"><input id="editMetricDate_${token}" class="historyInlineInput historyInlineDate" type="date" value="${String(r.measuredAt||TODAY).slice(0,10)}" max="${TODAY}"><span class="historyInlineLabel">· ${esc(label)} :</span><input id="editMetricValue_${token}" class="historyInlineInput historyInlineValue" type="number" step="0.1" value="${value??""}"><span class="historyInlineUnit">${esc(unit.trim())}</span></div><div class="actions compactRowActions"><button class="primary" data-save-metric="${token}">Enregistrer</button><button class="secondary" data-cancel-record-edit="1">Annuler</button></div></article>`:`<article class="historyRow"><div class="historyMeta"><strong>${shortDate(r.measuredAt)} · ${esc(label)}<span class="historyColon"> :</span> <span class="historyValue">${statsValue(value,unit)}</span></strong></div><div class="actions compactRowActions"><button class="secondary" data-edit-metric="${token}">Modifier</button><button class="danger" data-delete-metric="${token}">Supprimer</button></div></article>`; }).join("")||"<p class='muted'>Aucun enregistrement.</p>"; }
  function activityHistoryRows(rows){ const edit=state.ui.recordEdit; return rows.slice().sort((a,b)=>activityTime(b)-activityTime(a)).map(r=>{ const sessionEdit=edit?.kind==="sessionActivity"&&edit.id===r.id, manualEdit=edit?.kind==="activity"&&edit.id===r.id; if(r.sessionRunId){ return sessionEdit?`<article class="historyRow historyRowEditing historyRowEditingActivity"><div class="historyMeta historyInlineEditor activityInlineEditor"><span class="historyInlineLabel">${shortDate(r.startedAt)} · ${esc(activityTitle(r))}</span>${scoreSelect(`editSessionEase_${r.id}`,r.sessionEaseScore||3,{min:1,max:5,labelPrefix:"Ressenti "})}${scoreSelect(`editSessionBack_${r.id}`,r.quickBackScore??healthScore(profile()?.health.backPain)??5)}${scoreSelect(`editSessionKnee_${r.id}`,r.quickKneeScore??healthScore(Math.max(profile()?.health.kneePain??0,profile()?.health.tendonPain??0))??5)}${scoreSelect(`editSessionFatigue_${r.id}`,r.quickFatigueScore??healthScore(profile()?.health.fatigue)??5)}</div><div class="actions compactRowActions"><button class="primary" data-save-session-activity="${r.id}">Enregistrer</button><button class="secondary" data-cancel-record-edit="1">Annuler</button></div></article>`:`<article class="historyRow"><div class="historyMeta"><strong>${shortDate(r.startedAt)} · ${esc(activityTitle(r))}<span class="historyColon"> :</span> <span class="historyValue">${activitySummary(r)}</span></strong></div><div class="actions compactRowActions"><button class="secondary" data-edit-session-activity="${r.id}">Modifier</button></div></article>`; } return manualEdit?`<article class="historyRow historyRowEditing historyRowEditingActivity"><div class="historyMeta historyInlineEditor activityInlineEditor"><input id="editActivityDate_${r.id}" class="historyInlineInput historyInlineDate" type="date" value="${String(r.startedAt||TODAY).slice(0,10)}" max="${TODAY}"><select id="editActivityType_${r.id}" class="historyInlineInput historyInlineSelect"><option value="run" ${r.type==="run"?"selected":""}>Course</option><option value="walk" ${r.type==="walk"?"selected":""}>Marche</option><option value="bike" ${r.type==="bike"?"selected":""}>Vélo/cardio</option></select><input id="editActivityDistance_${r.id}" class="historyInlineInput historyInlineValue" type="number" step="0.1" value="${r.distanceKm??""}" placeholder="km"><input id="editActivityDuration_${r.id}" class="historyInlineInput historyInlineValue" type="number" step="0.1" value="${r.durationSeconds?Math.round(r.durationSeconds/60):""}" placeholder="min"><input id="editActivityHrAvg_${r.id}" class="historyInlineInput historyInlineValue" type="number" step="1" value="${r.hrAvg??""}" placeholder="FC moy"><input id="editActivityHrMax_${r.id}" class="historyInlineInput historyInlineValue" type="number" step="1" value="${r.hrMax??""}" placeholder="FC max">${scoreSelect(`editActivityFeeling_${r.id}`,r.feeling??3,{min:0,max:5,labelPrefix:"Ressenti "})}${scoreSelect(`editActivityPain_${r.id}`,r.pain??5,{min:0,max:5,labelPrefix:"Douleur "})}</div><div class="actions compactRowActions"><button class="primary" data-save-activity="${r.id}">Enregistrer</button><button class="secondary" data-cancel-record-edit="1">Annuler</button></div></article>`:`<article class="historyRow"><div class="historyMeta"><strong>${shortDate(r.startedAt)} · ${esc(activityTitle(r))}<span class="historyColon"> :</span> <span class="historyValue">${activitySummary(r)}</span></strong></div><div class="actions compactRowActions"><button class="secondary" data-edit-activity="${r.id}">Modifier</button><button class="danger" data-delete-activity="${r.id}">Supprimer</button></div></article>`; }).join("")||"<p class='muted'>Aucun enregistrement.</p>"; }
  function chartDataset(p,key){
    const weightRows=metricTimelineRows(p,"weightKg"), waistRows=metricRowsFor(p,"waistCm"), acts=state.activities.filter(x=>x.profileId===p.id).sort((a,b)=>activityTime(a)-activityTime(b)), allActivities=acts, cardioHrRows=acts.filter(a=>Number.isFinite(Number(a.hrAvg))||Number.isFinite(Number(a.hrMax))), cardioActivities=acts.filter(a=>isCardioActivity(a)), cardioVolume=cardioVolumeRows(acts), composition=metricRowsForAny(p,["bodyFatPct","waterPct"]);
    if(key==="weight") return {title:"Poids", rows:weightRows, renderChart:(rows,total)=>chart(rows,"weightKg",null,null,true,{key,total,legend:"poids kg"}), list:metricHistoryRows(metricPointRows(p,["weightKg"],{includeProfileStart:true}))};
    if(key==="weight_target") return {title:"Poids / cible", rows:weightRows, renderChart:(rows,total)=>chart(rows,"weightKg",null,p.targetWeightKg,true,{key,total,legend:"poids kg · cible",targetLabel:`cible ${p.targetWeightKg||"?"} kg`}), list:metricHistoryRows(metricPointRows(p,["weightKg"],{includeProfileStart:true}))};
    if(key==="waist") return {title:"Tour de ventre", rows:waistRows, renderChart:(rows,total)=>chart(rows,"waistCm",null,null,true,{key,total,legend:"tour de ventre cm",primaryColor:"var(--orange)"}), list:metricHistoryRows(metricPointRows(p,["waistCm"]))};
    if(key==="composition") return {title:"Composition", rows:composition, renderChart:(rows,total)=>chart(rows,"bodyFatPct","waterPct",null,true,{key,total,unit:"%",legend:"graisse % · eau %",primaryColor:"var(--orange)",secondaryColor:"var(--blue)",legendItems:[{label:"Graisse",color:"var(--orange)"},{label:"Eau",color:"var(--blue)"}]}), list:metricHistoryRows(metricPointRows(p,["bodyFatPct","waterPct","bmi","boneKg","muscleKg"]))};
    if(key==="activity") return {title:"Dernière activité", rows:allActivities, renderChart:null, list:activityHistoryRows(allActivities), listCount:allActivities.length};
    if(key==="cardio") return {title:"FC", rows:cardioHrRows, renderChart:(rows,total)=>chart(rows,"hrAvg","hrMax",null,true,{key,total,unit:"bpm",legend:"FC moyenne · FC max",primaryColor:"var(--red)",secondaryColor:"var(--orange)",legendItems:[{label:"FC moyenne",color:"var(--red)"},{label:"FC max",color:"var(--orange)"}]}), list:activityHistoryRows(cardioHrRows), listCount:cardioHrRows.length};
    if(key==="cardio_volume") return {title:"Cardio", rows:cardioVolume, renderChart:(rows,total)=>dualAxisChart(rows,"distanceKm","durationMin",true,{key,total,leftLabel:"Distance",rightLabel:"Temps",leftUnit:"km",rightUnit:"min",leftColor:"var(--blue)",rightColor:"var(--orange)",pointLabel:cardioPointLabel}), list:activityHistoryRows(cardioActivities), listCount:cardioActivities.length};
    return null;
  }
  function chartDetailModal(key){ const p=profile(); if(!p) return ""; const data=chartDataset(p,key); if(!data) return ""; const close=`<button class="iconClose" id="closeModal" aria-label="Fermer">×</button>`, shown=data.renderChart?visibleRows(key,data.rows):{rows:data.rows||[]}, historyOpen=!!state.ui.chartHistoryOpen?.[key], chartBlock=data.renderChart?`${chartControls(key,data.rows.length)}<div class="chartSurface">${data.renderChart(shown.rows,data.rows.length)}</div>`:""; return `<div class="modalShade fullModal"><section class="modalSheet wide chartModalSheet"><header><div><p class="eyebrow">Graphique détaillé</p><h1>${esc(data.title)}</h1></div>${close}</header>${chartBlock}<details class="historyFold chartHistoryFold" ${historyOpen?"open":""}><summary>Historique des points (${data.listCount||data.rows.length})</summary><div class="historyList">${data.list}</div></details></section></div>`; }
  function stats(){ if(!profile()) return needProfile(); const p=profile(), timeline=metricTimelineRows(p,"weightKg"), waistRows=metricRowsFor(p,"waistCm"), bodyFatRows=metricRowsFor(p,"bodyFatPct"), waterRows=metricRowsFor(p,"waterPct"), bmiRows=metricRowsFor(p,"bmi"), acts=state.activities.filter(x=>x.profileId===p.id).sort((a,b)=>activityTime(a)-activityTime(b)), last=latestWeightEntry(p)||{}, lastActivity=latestActivityEntry(acts), lastCardio=lastRun(acts), cardioVolume=cardioVolumeRows(acts), latestCardioVolume=cardioVolume.at(-1)||null, composition={bodyFatPct:bodyFatRows.at(-1)?.bodyFatPct,waterPct:waterRows.at(-1)?.waterPct,bmi:bmiRows.at(-1)?.bmi,waistCm:waistRows.at(-1)?.waistCm,boneKg:latestMetricValue(p,"boneKg"),muscleKg:latestMetricValue(p,"muscleKg")}, prev=timeline.filter(x=>x.weightKg&&x.id!==last.id).slice(-1)[0], trend=last.weightKg&&prev?.weightKg?(last.weightKg-prev.weightKg).toFixed(1):"--", pain=Math.max(p.health.backPain||0,p.health.kneePain||0,p.health.tendonPain||0), readiness=Math.max(0,Math.min(100,76+Math.min(state.sessionRuns.filter(x=>x.profileId===p.id&&x.completedAt).length,6)*3-pain*12-(p.health.fatigue||0)*6)), ready=readinessLabel(readiness), restHr=lastCardio?.restingHr, avgHr=lastCardio?.hrAvg, maxHr=lastCardio?.hrMax||Math.round(208-(0.7*(p.age||40))), syncLabel=state.sources.find(s=>s.id==="worker")?.enabled?"Garmin Worker prêt":"Données locales", lastUpdateTs=Math.max(...[...state.metrics.filter(x=>x.profileId===p.id).map(x=>metricTime(x)),...acts.map(x=>activityTime(x))].filter(v=>Number.isFinite(v))), lastUpdateLabel=dateTimeLabel(Number.isFinite(lastUpdateTs)?lastUpdateTs:Date.now()), dueSessions=weekPlan().filter(s=>(s.date||TODAY)<=TODAY), dueDone=dueSessions.filter(s=>s.completedAt).length, adherencePct=dueSessions.length?Math.round(dueDone/dueSessions.length*100):100, adherenceColor=adherencePct>=80?"var(--green)":adherencePct>=60?"#2f7cf6":adherencePct>=40?"#d3b227":adherencePct>=20?"var(--orange)":"var(--red)", zoneRows=hrZones(maxHr), cardioComment=latestCardioVolume?"cumul jour":"Aucune activité cardio"; return `<section class="statsPage"><div class="statsHero"><div><p class="eyebrow">Dashboard</p><div class="statsHeroTitle"><h1>Statistiques</h1><span class="statsUpdated">Dernière mise à jour : ${esc(lastUpdateLabel)}</span></div></div><span class="pill">${syncLabel}</span></div><div class="metricGrid">${metricCard({icon:"▣",title:"Poids",color:"var(--blue)",value:statsValue(last.weightKg," kg"),sub:`Variation ${trend} kg`,foot:"",visual:spark(timeline.slice(-8),"weightKg","var(--blue)"),clickable:true,attrs:`data-open-chart="weight"`,cardClass:"metricCompact"})}${metricCard({icon:"◔",title:"Préparation",color:"var(--green)",value:ready[0],sub:ready[1],action:`<button class="infoButton" id="openReadinessInfo" aria-label="Information préparation">i</button>`,visual:gauge(readiness,readiness>=75?"var(--green)":readiness>=50?"var(--orange)":"var(--red)",true),cardClass:"metricCompact"})}${metricCard({icon:"⌁",title:"Dernière activité",color:"var(--orange)",value:lastActivity?typeLabel(lastActivity.type):"--",sub:lastActivity?activitySummary(lastActivity):"Aucune activité enregistrée",foot:"",clickable:true,attrs:`data-open-chart="activity"`})}${metricCard({icon:"◷",title:"Assiduité",color:"var(--purple)",value:adherencePct>=80?"Très régulière":adherencePct>=60?"Solide":adherencePct>=40?"À surveiller":"Irrégulière",sub:"Séances prévues à date",foot:"",visual:gauge(adherencePct,adherenceColor),cardClass:"metricCompact"})}${metricCard({icon:"⇄",title:"Cardio",color:"var(--blue)",value:"cumul jour",sub:`Temps ${statsValue(latestCardioVolume?.durationMin," min")}`,foot:`Distance ${statsValue(latestCardioVolume?.distanceKm," km")}`,visual:dualAxisChart(cardioVolume,"distanceKm","durationMin",false,{key:"cardio_volume",leftLabel:"Distance",rightLabel:"Temps",leftUnit:"km",rightUnit:"min",leftColor:"var(--blue)",rightColor:"var(--orange)",pointLabel:cardioPointLabel}),clickable:true,attrs:`data-open-chart="cardio_volume"`,cardClass:"metricCompact"})}${metricCard({icon:"♥",title:"FC",color:"var(--red)",value:statsValue(maxHr," bpm"),sub:`FC max · repos ${statsValue(restHr," bpm")} · moyenne ${statsValue(avgHr," bpm")}`,visual:gauge(avgHr?Math.min(100,avgHr/maxHr*100):0,"var(--red)"),clickable:true,attrs:`data-open-chart="cardio"`})}${metricCard({icon:"◎",title:"Zone cardiaque estimée",color:"var(--orange)",value:statsValue(maxHr," bpm"),sub:"FC max estimée pour calculer les zones",foot:"",visual:`<div class="zoneCardList">${zoneRows.map(z=>`<div class="row"><span>${z.label}</span><strong>${z.value}</strong></div>`).join("")}</div>`})}${metricCard({icon:"◎",title:"IMC",color:"var(--orange)",value:statsValue(composition.bmi),sub:"",foot:[`Eau ${statsValue(composition.waterPct," %")}`,`Graisse ${statsValue(composition.bodyFatPct," %")}`,composition.boneKg!=null?`Os ${statsValue(composition.boneKg," kg")}`:"",composition.muscleKg!=null?`Muscle ${statsValue(composition.muscleKg," kg")}`:"",composition.waistCm!=null?`Tour ventre ${statsValue(composition.waistCm," cm")}`:""].filter(Boolean).join(" · "),clickable:true,attrs:`data-open-chart="composition"`,cardClass:"metricCompact metricCenter",valueClass:"metricValueCompact"})}</div><div class="grid two"><article class="panel graphPanel" data-open-chart="weight_target"><h2>Poids / cible</h2>${chart(timeline,"weightKg",null,p.targetWeightKg,false,{key:"weight_target",legend:"poids kg · cible",targetLabel:`cible ${p.targetWeightKg||"?"} kg`})}</article><article class="panel graphPanel" data-open-chart="waist"><h2>Tour de ventre</h2>${chart(waistRows,"waistCm",null,null,false,{key:"waist",legend:"tour de ventre cm",primaryColor:"var(--orange)"})}</article></div></section>`; }
  function modalLayer(){ if(!state.ui.modal) return ""; const close=`<button class="iconClose" id="closeModal" aria-label="Fermer">×</button>`; if(state.ui.modal==="metric") return `<div class="modalShade fullModal"><section class="modalSheet"><header><div><p class="eyebrow">Saisie datée</p><h1>Ajouter une pesée</h1></div>${close}</header><label>Date<input id="metricDate" type="date" value="${TODAY}" max="${TODAY}"></label><div class="grid two">${["weightKg:Poids kg","bodyFatPct:% graisse","waterPct:% eau","bmi:IMC","boneKg:Masse os kg","muscleKg:Masse muscle kg","waistCm:Tour ventre cm"].map(x=>{const [id,l]=x.split(":");return `<label>${l}<input id="${id}" type="number" step="0.1"></label>`}).join("")}</div><button class="primary" id="addMetric">Enregistrer pesée</button></section></div>`; if(state.ui.modal==="activity") return `<div class="modalShade fullModal"><section class="modalSheet"><header><div><p class="eyebrow">Saisie datée</p><h1>Ajouter une activité</h1></div>${close}</header><label>Date<input id="runDate" type="date" value="${TODAY}" max="${TODAY}"></label><div class="grid two">${["runDistance:Distance km","runDuration:Durée min","runPace:Vitesse moy km/h","runHrAvg:FC moyenne","runHrMax:FC max"].map(x=>{const [id,l]=x.split(":");return `<label>${l}<input id="${id}" type="number" step="0.1"></label>`}).join("")}<label>Type<select id="runType"><option value="run">Course</option><option value="walk">Marche</option><option value="bike">Vélo/cardio</option></select></label></div><h3>Ressenti</h3><div class="smileyGrid quickSmiley">${ratingControl("runFeeling","Ressenti",null)}${ratingControl("runPain","Douleur",null)}</div><button class="primary" id="addRun">Enregistrer activité</button></section></div>`; if(state.ui.modal==="sessionFeedback"){ const p=profile(), pending=state.ui.sessionFeedback, activity=state.activities.find(x=>x.id===pending?.activityId), title=activity?.sessionTitle||"Séance terminée"; return `<div class="modalShade fullModal"><section class="modalSheet"><header><div><p class="eyebrow">Séance terminée</p><h1>${esc(title)}</h1></div>${close}</header><p class="muted">Enregistre ton check rapide de sortie et le ressenti global. Si la séance a été trop dure, le plan futur sera allégé automatiquement.</p><label>Ressenti global<select id="sessionEaseScore">${[1,2,3,4,5].map(v=>`<option value="${v}" ${v===3?"selected":""}>${v}/5${v===5?" · Facile":v===1?" · Quasi impossible":""}</option>`).join("")}</select></label><h3>Check rapide de sortie</h3><div class="smileyGrid quickSmiley">${ratingControl("feedbackBack","Dos",healthScore(p?.health.backPain)??5)}${ratingControl("feedbackKnee","Genoux / Tendons",healthScore(Math.max(p?.health.kneePain??0,p?.health.tendonPain??0))??5)}${ratingControl("feedbackFatigue","Énergie / Fatigue",healthScore(p?.health.fatigue)??5)}</div><button class="primary" id="saveSessionFeedback">Enregistrer le feedback</button></section></div>`; } if(state.ui.modal==="newProfile") return `<div class="modalShade fullModal"><section class="modalSheet"><header><div><p class="eyebrow">Réglages</p><h1>Nouveau profil</h1></div>${close}</header>${newProfileBox()}</section></div>`; if(state.ui.modal==="readiness") return `<div class="modalShade"><section class="modalSheet"><header><div><p class="eyebrow">Indicateur</p><h1>Préparation</h1></div>${close}</header><p>La préparation combine les séances terminées, la douleur dos/genou/tendon et la fatigue. Elle ne remplace pas un avis médical.</p><div class="zoneList"><div class="row"><span>Vert</span><strong>75-100 : séance prévue possible</strong></div><div class="row"><span>Orange</span><strong>50-74 : rester facile</strong></div><div class="row"><span>Rouge</span><strong>0-49 : volume réduit</strong></div></div></section></div>`; if(String(state.ui.modal).startsWith("chart_")) return chartDetailModal(String(state.ui.modal).replace("chart_","")); return ""; }
  function foldPanel(title,content,cls=""){ return `<details class="panel settingsFold ${cls}"><summary>${title}</summary>${content}</details>`; }
  function settings(){ const p=profile(), profileRows=state.profiles.map(x=>`<details class="profileFold"><summary><span>${esc(x.name)}</span><strong>${x.id===state.activeProfileId?"Actif":"Inactif"}</strong></summary>${x.id===state.activeProfileId?profileForm(x):`<button class="secondary" data-profile="${x.id}">Choisir ce profil</button>`}</details>`).join("")||"<p>Aucun profil.</p>", appearance=`<article class="panel appearancePanel"><h2>Apparence</h2><div class="segmentedSwitch compactSegmented" role="group" aria-label="Thème">${["auto:Auto","dark:Sombre","light:Clair"].map(x=>{const [id,l]=x.split(":");return `<button class="secondary ${state.settings.theme===id?"active":""}" data-theme-choice="${id}">${l}</button>`}).join("")}</div></article>`, profiles=`<article class="panel profilePanel"><h2>Profils</h2>${profileRows}<button class="primary" id="openNewProfile">Créer un nouveau profil</button></article>`, mediaPanel=p?`<article class="panel appearancePanel"><h2>Vidéos</h2><p class="muted">Choisir le personnage affiché dans les vidéos et le mode offline.</p>${mediaChoiceSwitch("mediaGender",p.mediaGender||p.gender||"male")}</article>`:"", reminders=`<div class="reminderInlineRow"><div class="reminderToggle">${yesNoSwitch("notifEnabled","Rappel actif",state.settings.notifications.enabled)}</div><label class="timeCompact"><span>Heure :</span><input id="notifTime" type="time" value="${esc(state.settings.notifications.reminderTime||"08:00")}"></label></div><div class="row"><span>Autorisation</span><strong id="notificationStatus">${esc(notificationStatusText())}</strong></div><p class="muted">Si l'app est installée, le badge reste géré automatiquement. Sur iPhone, l'autorisation est demandée à l'installation si possible. L'Apple Watch reprend les notifications selon les réglages de recopie iPhone.</p><div class="actions"><button class="secondary" id="testNotification">Tester notification</button></div>`, pushBox=`<p class="muted">Rappels de séance depuis ton NAS, y compris lorsque la PWA est fermée. Sur iPhone, installe ResurGo depuis Safari sur l'écran d'accueil, puis autorise les notifications depuis ce bouton. Le travailleur Push du NAS doit être installé séparément. Chaque appareil dispose de son propre abonnement.</p>
      <div class="actions"><button class="primary" id="enableNasPush">Activer Push NAS</button>
      <button class="secondary" id="testNasPush">Envoyer notification de test</button>
      <button class="secondary" id="checkNasPush">Vérifier le statut</button>
      <button class="secondary" id="disableNasPush">Désactiver Push NAS</button></div>
      <p id="nasPushStatus" class="muted" aria-live="polite">Aucune vérification effectuée.</p>`, voice=`<div class="grid three"><label>Activé<select id="ttsEnabled"><option value="true" ${state.settings.tts.enabled?"selected":""}>Oui</option><option value="false" ${!state.settings.tts.enabled?"selected":""}>Non</option></select></label><label>Vitesse<input id="ttsRate" type="number" min="0.7" max="1.4" step="0.1" value="${state.settings.tts.rate}"></label><label>Volume<input id="ttsVolume" type="number" min="0" max="1" step="0.1" value="${state.settings.tts.volume}"></label></div><button class="secondary" id="testVoice">Tester TTS</button><div class="actions"><button class="secondary" id="previewFemale">Écouter coach féminin</button><button class="secondary" id="previewMale">Essayer voix masculine (à retravailler)</button><button class="secondary" id="cacheVoice">Télécharger voix choisie pour mode hors ligne</button></div><p id="voiceOfflineStatus" class="muted" aria-live="polite">Catalogue actuel : 80 phrases par voix (160 fichiers). Voix féminine recommandée pour le moment ; voix masculine en révision. Les consignes d'exercices utilisent encore une synthèse locale distincte.</p>`, workerBox=`<label>URL Worker<input id="workerUrl" value="${esc(state.settings.workerUrl)}"></label><label>Token app<input id="workerToken" value="${esc(state.settings.workerToken)}" type="password"></label><div class="actions"><button class="secondary" id="testWorker">Tester</button><button class="secondary" id="mockGarmin">Mock Garmin</button></div>`, exportBox=`<p class="muted">Sauvegarde intégrale chiffrée en JSON : profils, plans, entraînements, mesures, progression et réglages. Les jetons de session ne sont jamais copiés. La clé de récupération NAS est protégée dans le fichier chiffré lorsqu'elle existe.</p><div class="formGrid"><label>Mot de passe de sauvegarde (12 caractères minimum)<input type="password" id="backupPassword" autocomplete="new-password" placeholder="Phrase de passe forte"></label><label>Confirmer le mot de passe<input type="password" id="backupPasswordConfirm" autocomplete="new-password" placeholder="Confirmer"></label></div><div class="actions"><button class="primary" id="exportEncryptedJson">Exporter JSON chiffré</button></div><div class="formGrid"><label>Mot de passe pour restaurer<input type="password" id="backupRestorePassword" autocomplete="off" placeholder="Mot de passe du fichier"></label></div><div class="actions"><label class="secondary file">Restaurer JSON chiffré<input id="restoreEncryptedJson" type="file" accept="application/json"></label></div><p class="muted">La restauration peut fonctionner hors ligne. Si le fichier contient une clé de secours, ResurGo essaiera ensuite d'associer ce nouvel appareil au NAS sans administrateur.</p>`, nasBox=`<p class="muted">Synchronisation local-first des profils, séances et mesures. Sur le téléphone qui a créé ce compte NAS, tous les profils locaux peuvent être enregistrés sous le même compte ; un appareil nouvellement associé ne publie pas ses profils provisoires. Vérifie le nombre de profils et le statut de synchronisation. L'URL doit être celle de l'API Funnel HTTPS, jamais de la console administrateur.</p><label>Adresse de l'API NAS HTTPS<input id="nasSyncUrl" value="${esc(state.settings.nasSyncUrl||"")}" placeholder="https://..."></label><label>Nom du nouveau profil NAS<input id="nasProfileName" value="${esc(profile()?.name||"")}" placeholder="Profil sportif"></label><label>Nom de l'appareil<input id="nasDeviceName" value="" placeholder="iPhone, iPad, Mac…"></label><div class="actions"><button class="primary" id="nasCreateProfile">Créer mon profil NAS sans administrateur</button></div><label>Code temporaire provenant d'un appareil associé<input id="nasPairCodeInput" autocomplete="off" placeholder="Code d'association"></label><div class="actions"><button class="secondary" id="nasPairDevice">Associer cet appareil</button><button class="secondary" id="nasGenerateCode">Générer un code pour un autre appareil</button><button class="secondary" id="nasTestConnection">Tester la connexion</button><button class="secondary" id="nasRetryRecovery">Reprendre la récupération NAS</button><button class="secondary" id="nasSyncNow">Synchroniser maintenant</button><button class="secondary" id="nasSyncConflicts">Résoudre les conflits</button></div><p id="nasSyncStatus" aria-live="polite">Statut disponible après la connexion.</p><p id="nasPairOutput" class="muted" aria-live="polite"></p>`, appBox=`<div class="row"><span>Version installée</span><strong>v${APP_VERSION}</strong></div><div class="row"><span>Version en ligne</span><strong>${esc(remoteVersion||APP_VERSION)}</strong></div><p class="muted">La PWA vérifie automatiquement les mises à jour au lancement et quand le réseau revient. Les données IndexedDB restent locales.</p>`, maintenance=`<button class="danger strongDanger" id="deleteProfile">Supprimer profil actif</button><button class="danger strongDanger" id="resetAll">Tout effacer localement</button>`; return `<section class="grid"><h1>Réglages</h1>${appearance}${profiles}${mediaPanel}${foldPanel("Rappels séance",reminders)}${foldPanel("Web Push NAS — hors application",pushBox)}${foldPanel("Coach vocal",voice)}${foldPanel("Worker Garmin optionnel",workerBox)}${foldPanel("Sauvegarde chiffrée / restauration",exportBox)}${foldPanel("Capteurs Bluetooth · Bluefy ⓘ",bluefyHelpPanel())}${foldPanel("Synchronisation NAS — association des appareils",nasBox)}${foldPanel("Application",appBox)}${foldPanel("Maintenance",maintenance,"maintenancePanel")}</section>`; }
  function mediaChoiceSwitch(id,value){ return `<input id="${id}" type="hidden" value="${value}"><div class="segmentedSwitch segmentedTwo compactSegmented" role="group" aria-label="Genre des médias"><button class="secondary ${value==="male"?"active":""}" data-media-target="${id}" data-media-value="male">Homme</button><button class="secondary ${value==="female"?"active":""}" data-media-target="${id}" data-media-value="female">Femme</button></div>`; }
  function weekWindowSwitch(id,value){ return `<input id="${id}" type="hidden" value="${value}"><div class="segmentedSwitch segmentedTwo compactSegmented" role="group" aria-label="Fenêtre de planification"><button class="secondary ${Number(value)===5?"active":""}" data-week-window-target="${id}" data-week-window-value="5">Semaine 5 jours</button><button class="secondary ${Number(value)===7?"active":""}" data-week-window-target="${id}" data-week-window-value="7">Semaine 7 jours</button></div>`; }
  function goalFocusInput(id,value="global"){
    const options=[
      ["global","Global : un peu de tout"],
      ["running","Course à pied prioritaire"],
      ["cycling","Vélo prioritaire"],
      ["fitness","Remise en forme"],
      ["weight_loss","Perte de poids / activité durable"],
      ["strength","Musculation au poids du corps"]
    ];
    return `<label>Priorité sportive (plan global coordonné)
      <select id="${id}">${options.map(([v,label])=>
        `<option value="${v}" ${value===v?"selected":""}>${esc(label)}</option>`).join("")}</select>
      </label>`;
  }
  function newProfileBox(){ const seed={health:{backPain:null,kneePain:null,tendonPain:null,fatigue:null,irradiating:false,neurological:false},levels:{running:"R1",push:"P1",pull:"T1",legs:"J1",frontCore:"G1",sideCore:"L1",mobility:"M1"}}; return `<div class="newProfile"><div class="grid four"><label>Nom du profil<input id="newProfileName" placeholder="Prénom ou pseudo"></label><label>Sexe<select id="newGender"><option value="male">Homme</option><option value="female">Femme</option></select></label><label>Âge<input id="newAge" type="number"></label><label>Taille cm<input id="newHeight" type="number"></label><label>Poids départ kg<input id="newWeight" type="number" step="0.1"></label><label>Poids objectif kg<input id="newTarget" type="number" step="0.1"></label><label>Durée objectif mois<input id="newTargetMonths" type="number" min="6" value="6"></label></div><input id="newMediaGender" type="hidden" value="male"><div class="formSectionGap">${goalFocusInput("newGoalFocus","global")}${weekWindowSwitch("newAvailabilityDays",5)}</div><p class="muted">Un seul programme gère les sports sélectionnés, la récupération et les jours libres ; la priorité choisie module la répartition des séances.</p><h3>État du corps</h3><p class="muted">5 = tout va bien, 0 = alerte rouge. Ces valeurs servent dès la première génération du plan.</p>${bodyStateControls("newProfile",seed,"quickSmiley bodyStateGrid")}<div class="safetySwitchRow">${yesNoSwitch("newIrradiating","Douleur irradiée",false)}${yesNoSwitch("newNeurological","Signe neurologique",false)}</div><h3>Tests initiaux</h3><p class="muted">Choisis le niveau confortable réel, pas le maximum possible.</p>${levelHelp()}<div class="grid three">${Object.keys(levels).map(k=>`<label>${levelNames[k]}<select id="newLevel_${k}">${levelOptions(k,seed.levels[k])}</select></label>`).join("")}</div><div class="formActionGap"><button class="primary" id="createProfile">Créer nouveau profil</button></div></div>`; }
  function yesNoSwitch(id,label,value){ return `<label class="booleanSwitch"><span class="switchLabel">${label}</span><input id="${id}" type="checkbox" ${value?"checked":""}><span class="switchPill"><span class="switchState">${value?"Oui":"Non"}</span><span class="switchKnob"></span></span></label>`; }
  function profileForm(p){ const g=goalInfo(p), windowDays=weekWindowDays(p); return `<div class="profileEditor"><div class="grid four"><label>Nom<input id="profileName" value="${esc(p.name)}"></label><label>Sexe<select id="gender"><option value="male" ${(p.gender||"male")==="male"?"selected":""}>Homme</option><option value="female" ${p.gender==="female"?"selected":""}>Femme</option></select></label><label>Âge<input id="age" type="number" value="${p.age||""}"></label><label>Taille cm<input id="heightCm" type="number" value="${p.heightCm||""}"></label><label>Poids départ<input id="startWeightKg" type="number" step="0.1" value="${p.startWeightKg||""}"></label><label>Poids objectif<input id="targetWeightKg" type="number" step="0.1" value="${p.targetWeightKg||""}"></label><label>Durée objectif mois<input id="targetMonths" type="number" min="6" value="${p.targetMonths||6}"></label></div>${goalFocusInput("goalFocus",p.goalFocus||"global")}${weekWindowSwitch("availabilityDays",windowDays)}<p class="notice goalGuard">Garde-fou objectif : minimum 6 mois et maximum 5 kg/mois. Cadence actuelle : ${esc(g.text)}. Matériel prévu : poids du corps, chaise ou banc, élastique.</p><label>Historique sportif<textarea id="sportsHistory">${esc(p.sportsHistory)}</textarea></label><h3>État du corps</h3><p class="muted">5 = tout va bien, 0 = alerte rouge. Si Genoux / Tendons est à 3/5 ou moins, le plan exclut squat, fente, pliométrie et step, mais conserve marche-course ou course très facile sur plat, 45 min maximum.</p>${bodyStateControls("profile",p,"quickSmiley bodyStateGrid")}<div class="safetySwitchRow">${yesNoSwitch("irradiating","Douleur irradiée",p.health.irradiating)}${yesNoSwitch("neurological","Signe neurologique",p.health.neurological)}</div><h3>Tests initiaux</h3><p class="muted">Choisis le niveau réel confortable, pas le maximum possible. Le plan progresse mieux avec une base facile et propre.</p>${levelHelp()}<div class="grid three">${Object.keys(levels).map(k=>`<label>${levelNames[k]}<select id="level_${k}">${levelOptions(k,p.levels[k])}</select></label>`).join("")}</div><button class="primary" id="regenProfilePlan">Regénérer le plan</button></div>`; }

  // Générer les fiches d'exercices et les zones anatomiques à partir de la bibliothèque centrale.
  function needProfile(){ return `<section class="hero"><h1>Profil requis</h1><p>Crée un profil pour activer cette page.</p>${newProfileBox()}</section>`; }
  function mediaGenderChoice(p=profile()){ return p?.mediaGender==="female"?"female":"male"; }
  function genderedVideoPath(path, mediaGender){
    const raw=String(path||"");
    if(!raw||raw==="/") return raw;
    return mediaGender==="female"
      ? raw.replace(/(^|[\/-])male(?=[\/-])/g,"$1female").replace(/(^|[\/-])Male(?=[\/-])/g,"$1Female")
      : raw.replace(/(^|[\/-])female(?=[\/-])/g,"$1male").replace(/(^|[\/-])Female(?=[\/-])/g,"$1Male");
  }
  function videoSrc(x){
    const chosen=state.exerciseVideos?.[x.id]||x.videoPath||"/";
    const path=genderedVideoPath(chosen, mediaGenderChoice());
    return /^https?:\/\//.test(path)?path:(state.settings.videoBase||videos.defaultBase)+path;
  }
  function exerciseDiagramMarkup(x){ return typeof globalThis.__resurgoExerciseDiagram==="function" ? globalThis.__resurgoExerciseDiagram(x) : `<div class="notice">Le diaporama offline n'est pas encore disponible pour cet exercice.</div>`; }
  function rehabPanel(x){
    const details={
      quad_set:["Objectif : réveiller le quadriceps sans plier le genou.","Repère : la serviette s'écrase, la rotule remonte légèrement, la respiration reste libre.","Dosage : 3 séries de 8 à 12 contractions de 5 secondes, douleur maximale 2/5."],
      straight_leg_raise:["Objectif : renforcer le quadriceps sans flexion profonde.","Repère : la cuisse reste contractée avant et pendant la montée.","Dosage : 2 à 3 séries de 8 à 10 répétitions lentes, repos court."],
      seated_knee_extension:["Objectif : travailler l'extension en petite amplitude contrôlée.","Repère : le genou ne claque pas en fin de mouvement et la rotule reste confortable.","Dosage : 2 séries de 8 à 12 répétitions, amplitude réduite si gêne."],
      standing_hamstring_curl:["Objectif : renforcer l'arrière de cuisse pour stabiliser le genou.","Repère : les deux cuisses restent alignées, le bassin ne part pas vers l'avant.","Dosage : 2 séries de 8 à 12 répétitions par côté."],
      clamshell:["Objectif : améliorer le contrôle hanche-genou-rotule.","Repère : le bassin ne roule pas en arrière, le mouvement vient de la hanche.","Dosage : 2 séries de 10 à 15 répétitions par côté."],
      hip_abduction_side:["Objectif : renforcer le moyen fessier pour tenir l'axe du genou.","Repère : les orteils restent légèrement vers l'avant, le bassin reste empilé.","Dosage : 2 séries de 8 à 12 répétitions par côté."]
    }[x.id];
    if(!details) return "";
    return `<div class="rehabPanel"><p class="eyebrow">Fiche kiné genou intégrée</p>${details.map(v=>`<p>${esc(v)}</p>`).join("")}<p class="notice">Stop si douleur vive, gonflement, blocage, instabilité ou douleur qui augmente après la séance. Cette fiche ne remplace pas l'avis du kiné ou du médecin.</p></div>`;
  }
  function media(x,compact=false){ const raw=state.exerciseVideos?.[x.id]||x.videoPath||"", hasVideo=!!raw&&raw!=="/"&&/\.mp4($|\?)/i.test(raw), src=hasVideo?videoSrc(x):""; return `${hasVideo?`<div class="videoFrame"><video controls playsinline preload="metadata" src="${esc(src)}"></video></div>`:""}<details class="motionDetails" ${compact?"":"open"}><summary>Diaporama offline en boucle</summary>${exerciseDiagramMarkup(x)}</details>`; }
  function trainingTags(x){ const meta=effectiveTraining(x); return `<div class="exerciseTags"><span class="trainingTag">${esc(trainingLabels.role[meta.role]||meta.role)}</span><span class="trainingTag">${esc(trainingLabels.load[meta.load]||meta.load)}</span>${meta.compatibleAddon?`<span class="trainingTag softTag">Complément OK</span>`:""}</div>`; }
  function optionTags(options,labels,current){ return options.map(v=>`<option value="${v}" ${current===v?"selected":""}>${esc(labels[v]||v)}</option>`).join(""); }
  function card(x){ const meta=effectiveTraining(x), sourceLink=x.sourceUrl&&!/\.pdf($|\?)/i.test(x.sourceUrl)?`<p><a class="textLink" href="${esc(x.sourceUrl)}" target="_blank" rel="noopener">Lien explicatif</a></p>`:""; return `<article class="panel exercise"><div class="media">${media(x)}</div><div class="exerciseTitle"><div><p class="eyebrow">${familyLabel(x.family)} · ${x.type} · ${x.sets} série(s)</p><h2>${x.name}</h2>${trainingTags(x)}</div><details class="editExercise"><summary title="Modifier l'exercice">✎</summary><label>URL vidéo .mp4<input id="video_${x.id}" value="${esc(state.exerciseVideos?.[x.id]||x.videoPath||"")}" placeholder="https://...mp4"></label><label>Type d'effort<select id="role_${x.id}">${optionTags(trainingRoleOptions,trainingLabels.role,meta.role)}</select></label><label>Charge<select id="load_${x.id}">${optionTags(trainingLoadOptions,trainingLabels.load,meta.load)}</select></label><button class="secondary" data-save-exercise="${x.id}">Enregistrer</button></details></div><p>${x.short}</p>${targetPanel(x)}${rehabPanel(x)}<h3>Comment faire</h3><ol>${x.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>${sourceLink}<p class="notice">${x.safety}</p></article>`; }
  function targets(x){ const byId={dead_bug:["abdos profonds","lombaires stables"],bird_dog:["lombaires","fessiers","épaules"],front_plank:["abdos","épaules"],side_plank_knees:["obliques","hanches"],hollow_hold:["abdos"],wall_pushup:["pectoraux","triceps"],incline_pushup:["pectoraux","épaules","triceps"],knee_pushup:["pectoraux","triceps"],pike_pushup:["épaules","triceps"],band_row:["haut du dos","biceps"],band_pulldown:["grand dorsal","haut du dos"],reverse_fly:["arrière épaules","haut du dos"],sit_to_stand:["cuisses","fessiers"],box_squat:["cuisses","fessiers"],split_squat:["cuisses","fessiers"],glute_bridge:["fessiers","ischios"],calf_raise:["mollets"],hip_hinge:["ischios","fessiers","dos stable"],quad_set:["quadriceps","articulation du genou"],straight_leg_raise:["quadriceps","articulation de hanche","stabilisation du genou"],seated_knee_extension:["quadriceps","articulation du genou"],standing_hamstring_curl:["ischios","articulation du genou","stabilisateurs de hanche"],clamshell:["moyen fessier","articulation de hanche","axe du genou"],hip_abduction_side:["moyen fessier","articulation de hanche","axe du genou"],hip_flexor:["psoas","hanches"],thoracic_rotation:["haut du dos"],ankle_wall:["chevilles","mollets"],hamstring_floss:["ischios"],shoulder_wall_slide:["épaules","haut du dos"],brisk_walk:["cardio","mollets"],easy_run:["cardio","jambes"],run_walk:["cardio","jambes"],low_impact_cardio:["cardio"],step_up_low:["cuisses","fessiers"],warmup_flow:["mobilité globale"],cooldown_breathing:["respiration"]}; return byId[x.id]||({core:["abdos","dos stable"],push:["pectoraux","épaules"],pull:["dos","bras"],legs:["cuisses","fessiers"],knee_rehab:["genou","hanche"],mobility:["mobilité"],cardio:["coeur","jambes"]}[x.family]||["corps entier"]); }
  function targetPanel(x){ return `<div class="targetPanel">${muscleMap(x)}<div><p class="eyebrow">Zones travaillées</p><div class="targetChips">${targets(x).map(t=>`<span>${esc(t)}</span>`).join("")}</div></div></div>`; }

  // Produire ici les schémas SVG offline.
  // Le rendu reste volontairement simple pour rester robuste sans dépendance externe.
  function poseLine(p,cls="",op=1){ const q=k=>p[k], line=(a,b)=>`<line x1="${q(a)[0]}" y1="${q(a)[1]}" x2="${q(b)[0]}" y2="${q(b)[1]}"/>`; return `<g class="pose ${cls}" opacity="${op}"><circle cx="${p.head[0]}" cy="${p.head[1]}" r="13"/><path d="M${p.neck[0]} ${p.neck[1]} Q ${p.mid[0]} ${p.mid[1]} ${p.hip[0]} ${p.hip[1]}"/>${line("neck","lhand")}${line("neck","rhand")}${line("hip","lknee")}${line("lknee","lfoot")}${line("hip","rknee")}${line("rknee","rfoot")}</g>`; }
  function poseTemplate(x){ const map={dead_bug:["Dos au sol","Bras/jambe opposés descendent", {head:[72,148],neck:[95,150],mid:[160,162],hip:[224,151],lhand:[126,82],rhand:[176,82],lknee:[160,96],lfoot:[194,96],rknee:[224,98],rfoot:[260,98]}, {head:[72,148],neck:[95,150],mid:[160,162],hip:[224,151],lhand:[72,94],rhand:[176,82],lknee:[160,96],lfoot:[194,96],rknee:[272,158],rfoot:[318,170]}], hollow_hold:["Dos plaqué","Éloigne bras et jambes sans cambrer", {head:[80,145],neck:[105,150],mid:[168,162],hip:[230,154],lhand:[132,82],rhand:[160,82],lknee:[230,110],lfoot:[270,112],rknee:[245,116],rfoot:[288,122]}, {head:[80,145],neck:[105,150],mid:[168,162],hip:[230,154],lhand:[84,88],rhand:[110,80],lknee:[274,150],lfoot:[328,162],rknee:[280,158],rfoot:[338,175]}], bird_dog:["À quatre pattes","Tends bras et jambe opposés", {head:[105,101],neck:[126,112],mid:[188,136],hip:[246,136],lhand:[122,184],rhand:[172,184],lknee:[238,186],lfoot:[222,206],rknee:[286,186],rfoot:[304,206]}, {head:[105,101],neck:[126,112],mid:[188,136],hip:[246,136],lhand:[62,126],rhand:[172,184],lknee:[238,186],lfoot:[222,206],rknee:[320,122],rfoot:[365,110]}], plank:["Corps droit","Garde la ligne épaules-hanches", {head:[92,118],neck:[118,127],mid:[202,138],hip:[282,146],lhand:[95,182],rhand:[124,184],lknee:[300,180],lfoot:[350,184],rknee:[302,178],rfoot:[362,183]}, {head:[92,116],neck:[118,126],mid:[202,134],hip:[282,142],lhand:[95,182],rhand:[124,184],lknee:[300,180],lfoot:[350,184],rknee:[302,178],rfoot:[362,183]}], push:["Planche mains au sol","Descends puis repousse en bloc", {head:[96,112],neck:[124,124],mid:[200,139],hip:[280,154],lhand:[122,186],rhand:[154,190],lknee:[298,183],lfoot:[356,190],rknee:[300,183],rfoot:[365,190]}, {head:[96,146],neck:[124,156],mid:[200,166],hip:[280,176],lhand:[122,190],rhand:[154,194],lknee:[298,190],lfoot:[356,194],rknee:[300,190],rfoot:[365,194]}], squat:["Debout solide","Hanches arrière, genoux alignés", {head:[152,66],neck:[152,88],mid:[152,126],hip:[152,154],lhand:[120,132],rhand:[184,132],lknee:[134,194],lfoot:[112,210],rknee:[172,194],rfoot:[198,210]}, {head:[282,88],neck:[282,110],mid:[268,142],hip:[246,166],lhand:[235,136],rhand:[314,136],lknee:[220,196],lfoot:[190,210],rknee:[286,194],rfoot:[318,210]}], bridge:["Épaules au sol","Monte les hanches sans cambrer", {head:[82,156],neck:[106,158],mid:[170,170],hip:[238,168],lhand:[78,186],rhand:[115,184],lknee:[268,132],lfoot:[318,176],rknee:[286,138],rfoot:[350,176]}, {head:[82,156],neck:[106,158],mid:[170,148],hip:[238,118],lhand:[78,186],rhand:[115,184],lknee:[268,132],lfoot:[318,176],rknee:[286,138],rfoot:[350,176]}],

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
  function chartTicks(min,max,target=7){
    const tickCount=Math.max(5,Math.min(10,Math.round(target)||7)), desired=tickCount-1, center=(min+max)/2, rawRange=max-min;
    let step;
    if(rawRange<=0){
      step=chartNiceStep(Math.max(.1,Math.abs(center)*.01),desired);
    }else{
      const comfort=Math.max(rawRange*1.15,Math.abs(center)*.004);
      step=chartNiceStep(comfort,desired);
    }
    let span=step*desired, minY, maxY;
    if(rawRange<=0){
      minY=Number((center-span/2).toPrecision(12));
      maxY=Number((minY+span).toPrecision(12));
    }else{
      minY=Math.floor((center-span/2)/step)*step;
      maxY=Number((minY+span).toPrecision(12));
      if(maxY<max){ maxY=Math.ceil(max/step)*step; minY=Number((maxY-span).toPrecision(12)); }
      if(minY>min){ minY=Math.floor(min/step)*step; maxY=Number((minY+span).toPrecision(12)); }
    }
    const ticks=Array.from({length:tickCount},(_,i)=>Number((minY+(i*step)).toPrecision(12)));
    return {ticks,minY,maxY,step,tickCount};
  }
  function chartFormatValue(v,step){ const decimals=step<1?Math.min(3,Math.ceil(-Math.log10(step))):0; return Number(v.toFixed(decimals)).toLocaleString("fr-FR",{minimumFractionDigits:decimals,maximumFractionDigits:decimals}); }
  function chartUnit(a,b,opts){ if(opts.unit!=null) return opts.unit; const ua=metricUnits?.[a]||"", ub=b?metricUnits?.[b]||"":ua; return ua===ub?ua.trim():""; }
  function chartLegend(items=[]){ return items.length>1?`<div class="chartLegend">${items.map(x=>`<span><i style="background:${x.color}"></i>${esc(x.label)}</span>`).join("")}</div>`:""; }
  function chart(rows,a,b,target=null,large=false,opts={}){
    if(!rows.length) return "<p class='muted'>Aucune donnée.</p>";
    const series=[a,b].filter(Boolean), vals=rows.flatMap(r=>series.map(k=>metricValue(r,k))).filter(v=>v!=null), rawTarget=target==null||target===""?null:Number(target), targetValue=Number.isFinite(rawTarget)&&rawTarget>0?rawTarget:null;
    if(targetValue!=null) vals.push(targetValue);
    if(!vals.length) return "<p class='muted'>Aucune donnée.</p>";
    const min=Math.min(...vals), max=Math.max(...vals), pad=min===max?0:(max-min)*.08, W=large?820:520,H=large?620:190, plot=large?{l:54,r:18,t:18,b:30}:{l:62,r:24,t:38,b:46}, targetLines=Math.max(5,Math.min(8,Math.round((H-plot.t-plot.b)/76))), scale=chartTicks(min-pad,max+pad,targetLines), minY=scale.minY, maxY=scale.maxY, innerW=W-plot.l-plot.r, innerH=H-plot.t-plot.b;
    const x=i=>rows.length>1?plot.l+i*innerW/(rows.length-1):plot.l+innerW/2, y=v=>H-plot.b-((v-minY)/Math.max(1,maxY-minY)*innerH), pts=k=>rows.map((r,i)=>metricValue(r,k)!=null?`${x(i)},${y(metricValue(r,k))}`:null).filter(Boolean).join(" "), points=(k,color)=>rows.map((r,i)=>metricValue(r,k)!=null?`<circle class="chartPoint" data-point-index="${i}" cx="${x(i)}" cy="${y(metricValue(r,k))}" r="5" fill="${color}"><title>${esc(chartPointLabel(r,k))}</title></circle>`:"").join("");
    const times=rows.map(chartTime).filter(Boolean), spanDays=times.length>1?(Math.max(...times)-Math.min(...times))/86400000:0, yTicks=scale.ticks, xTicks=chartTickIndexes(rows,large?6:4), targetY=targetValue!=null?y(targetValue):null, unit=chartUnit(a,b,opts), legend=opts.legend||(b?"bleu poids · orange secondaire":(a==="waistCm"?"tour de ventre":"poids")), primaryColor=opts.primaryColor||"var(--blue)", secondaryColor=opts.secondaryColor||"var(--orange)", targetLabel=opts.targetLabel||`cible ${targetValue} kg`, key=opts.key||"", total=Number(opts.total)||rows.length;
    const yAxis=yTicks.map(v=>`<line x1="${plot.l}" y1="${y(v)}" x2="${W-plot.r}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${plot.l-8}" y="${y(v)+4}" text-anchor="end" fill="var(--muted)" font-size="12">${chartFormatValue(v,scale.step)}</text>`).join("");
    const xAxis=xTicks.map(i=>`<text x="${x(i)}" y="${H-18}" text-anchor="middle" fill="var(--muted)" font-size="12">${esc(chartDateLabel(chartTime(rows[i]),spanDays))}</text>`).join("");
    const legendItems=opts.legendItems||(b?[{label:metricLabels[a]||a,color:primaryColor},{label:metricLabels[b]||b,color:secondaryColor}]:[]);
    return `${chartLegend(legendItems)}<svg class="chart ${large?"chartLarge":""}" viewBox="0 0 ${W} ${H}" data-interactive-chart="${key?1:0}" data-chart-key="${esc(key)}" data-chart-total="${total}"><rect width="${W}" height="${H}" rx="12" fill="var(--chart-bg)"/>${yAxis}<line x1="${plot.l}" y1="${plot.t}" x2="${plot.l}" y2="${H-plot.b}" stroke="var(--line)" stroke-width="1.5"/><line x1="${plot.l}" y1="${H-plot.b}" x2="${W-plot.r}" y2="${H-plot.b}" stroke="var(--line)" stroke-width="1.5"/>${xAxis}<text x="${plot.l}" y="24" fill="var(--muted)" font-size="12">${esc(unit||legend)}</text>${targetY!=null?`<line x1="${plot.l}" y1="${targetY}" x2="${W-plot.r}" y2="${targetY}" stroke="var(--green)" stroke-width="3" stroke-dasharray="8 8"/><text x="${W-plot.r-8}" y="${Math.max(20,targetY-8)}" text-anchor="end" fill="var(--green)">${esc(targetLabel)}</text>`:""}<polyline points="${pts(a)}" fill="none" stroke="${primaryColor}" stroke-width="4"/>${b?`<polyline points="${pts(b)}" fill="none" stroke="${secondaryColor}" stroke-width="4"/>`:""}${points(a,primaryColor)}${b?points(b,secondaryColor):""}<text class="chartReadout" x="${W-plot.r}" y="24" text-anchor="end" fill="var(--ink)">${esc(rows.length?chartPointLabel(rows[rows.length-1],a):"")}</text></svg>`;
  }
  function dualAxisChart(rows,leftKey,rightKey,large=false,opts={}){
    if(!rows.length) return "<p class='muted'>Aucune donnée.</p>";
    const leftVals=rows.map(r=>Number(r?.[leftKey])).filter(v=>Number.isFinite(v)&&v>0), rightVals=rows.map(r=>Number(r?.[rightKey])).filter(v=>Number.isFinite(v)&&v>0);
    if(!leftVals.length&&!rightVals.length) return "<p class='muted'>Aucune donnée.</p>";
    const W=large?820:520, H=large?620:190, plot=large?{l:54,r:54,t:18,b:30}:{l:52,r:52,t:38,b:46}, tickCount=Math.max(5,Math.min(8,Math.round((H-plot.t-plot.b)/76))), leftScale=chartTicks(Math.min(...(leftVals.length?leftVals:[0])),Math.max(...(leftVals.length?leftVals:[0])),tickCount), rightScale=chartTicks(Math.min(...(rightVals.length?rightVals:[0])),Math.max(...(rightVals.length?rightVals:[0])),tickCount), innerW=W-plot.l-plot.r, innerH=H-plot.t-plot.b, x=i=>rows.length>1?plot.l+i*innerW/(rows.length-1):plot.l+innerW/2, yLeft=v=>H-plot.b-((v-leftScale.minY)/Math.max(1,leftScale.maxY-leftScale.minY)*innerH), yRight=v=>H-plot.b-((v-rightScale.minY)/Math.max(1,rightScale.maxY-rightScale.minY)*innerH);
    const times=rows.map(chartTime).filter(Boolean), spanDays=times.length>1?(Math.max(...times)-Math.min(...times))/86400000:0, xTicks=chartTickIndexes(rows,large?6:4), key=opts.key||"", total=Number(opts.total)||rows.length;
    const grid=Array.from({length:leftScale.ticks.length},(_,i)=>{ const yy=plot.t+(i*innerH/Math.max(1,leftScale.ticks.length-1)), lv=leftScale.ticks[leftScale.ticks.length-1-i], rv=rightScale.ticks[rightScale.ticks.length-1-i]; return `<line x1="${plot.l}" y1="${yy}" x2="${W-plot.r}" y2="${yy}" stroke="var(--line)" stroke-width="1"/><text x="${plot.l-8}" y="${yy+4}" text-anchor="end" fill="var(--muted)" font-size="12">${chartFormatValue(lv,leftScale.step)}</text><text x="${W-plot.r+8}" y="${yy+4}" fill="var(--muted)" font-size="12">${chartFormatValue(rv,rightScale.step)}</text>`; }).join("");
    const leftColor=opts.leftColor||"var(--blue)", rightColor=opts.rightColor||"var(--orange)";
    const leftPts=rows.map((r,i)=>Number(r?.[leftKey])>0?`${x(i)},${yLeft(Number(r[leftKey]))}`:null).filter(Boolean).join(" "), rightPts=rows.map((r,i)=>Number(r?.[rightKey])>0?`${x(i)},${yRight(Number(r[rightKey]))}`:null).filter(Boolean).join(" ");
    const leftPoints=rows.map((r,i)=>Number(r?.[leftKey])>0?`<circle class="chartPoint" data-point-index="${i}" cx="${x(i)}" cy="${yLeft(Number(r[leftKey]))}" r="5" fill="${leftColor}"><title>${esc(opts.pointLabel?opts.pointLabel(r):chartPointLabel(r,leftKey))}</title></circle>`:"").join("");
    const rightPoints=rows.map((r,i)=>Number(r?.[rightKey])>0?`<circle class="chartPoint" data-point-index="${i}" cx="${x(i)}" cy="${yRight(Number(r[rightKey]))}" r="5" fill="${rightColor}"><title>${esc(opts.pointLabel?opts.pointLabel(r):chartPointLabel(r,rightKey))}</title></circle>`:"").join("");
    const xAxis=xTicks.map(i=>`<text x="${x(i)}" y="${H-18}" text-anchor="middle" fill="var(--muted)" font-size="12">${esc(chartDateLabel(chartTime(rows[i]),spanDays))}</text>`).join("");
    const last=rows[rows.length-1];
    return `${chartLegend([{label:opts.leftLabel||leftKey,color:leftColor},{label:opts.rightLabel||rightKey,color:rightColor}])}<svg class="chart ${large?"chartLarge":""}" viewBox="0 0 ${W} ${H}" data-interactive-chart="${key?1:0}" data-chart-key="${esc(key)}" data-chart-total="${total}"><rect width="${W}" height="${H}" rx="12" fill="var(--chart-bg)"/>${grid}<line x1="${plot.l}" y1="${plot.t}" x2="${plot.l}" y2="${H-plot.b}" stroke="var(--line)" stroke-width="1.5"/><line x1="${W-plot.r}" y1="${plot.t}" x2="${W-plot.r}" y2="${H-plot.b}" stroke="var(--line)" stroke-width="1.5"/><line x1="${plot.l}" y1="${H-plot.b}" x2="${W-plot.r}" y2="${H-plot.b}" stroke="var(--line)" stroke-width="1.5"/>${xAxis}<text x="${plot.l}" y="24" fill="${leftColor}" font-size="12">${esc(opts.leftUnit||"km")}</text><text x="${W-plot.r}" y="24" text-anchor="end" fill="${rightColor}" font-size="12">${esc(opts.rightUnit||"min")}</text>${leftPts?`<polyline points="${leftPts}" fill="none" stroke="${leftColor}" stroke-width="4"/>`:""}${rightPts?`<polyline points="${rightPts}" fill="none" stroke="${rightColor}" stroke-width="4"/>`:""}${leftPoints}${rightPoints}<text class="chartReadout" x="${W-plot.r}" y="24" text-anchor="end" fill="var(--ink)">${esc(opts.pointLabel?opts.pointLabel(last):"")}</text></svg>`;
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
      const rawDate=datedRawValue(`editMetricDate_${token}`); if(!rawDate){ save("Date de mesure invalide : pas de saisie future.").then(render); return; }
      p.createdAt=`${rawDate}T12:00:00.000Z`;
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
    const feelingEl=el(`editActivityFeeling_${id}`), painEl=el(`editActivityPain_${id}`);
    item.feeling=feelingEl?num(`editActivityFeeling_${id}`):item.feeling;
    item.pain=painEl?num(`editActivityPain_${id}`):item.pain;
    if(item.profileId) refreshPlanAfterActivity(item.profileId);
    state.ui.recordEdit=null;
    save("Activité mise à jour.").then(render);
  }
  function saveSessionActivityRecord(id){
    const item=state.activities.find(x=>x.id===id&&x.sessionRunId); if(!item) return;
    const easeScore=Number(el(`editSessionEase_${id}`)?.value)||null, backScore=Number(el(`editSessionBack_${id}`)?.value), kneeScore=Number(el(`editSessionKnee_${id}`)?.value), fatigueScore=Number(el(`editSessionFatigue_${id}`)?.value);
    item.sessionEaseScore=easeScore;
    item.quickBackScore=Number.isFinite(backScore)?backScore:null;
    item.quickKneeScore=Number.isFinite(kneeScore)?kneeScore:null;
    item.quickFatigueScore=Number.isFinite(fatigueScore)?fatigueScore:null;
    const runState=state.sessionRuns.find(x=>x.id===item.sessionRunId);
    if(runState) runState.feedback={easeScore:item.sessionEaseScore,backScore:item.quickBackScore,kneeScore:item.quickKneeScore,fatigueScore:item.quickFatigueScore,updatedAt:new Date().toISOString()};
    if(item.profileId) applySessionFeedback(item.profileId,{easeScore:item.sessionEaseScore,backScore:item.quickBackScore,kneeScore:item.quickKneeScore,fatigueScore:item.quickFatigueScore},runState);
    state.ui.recordEdit=null;
    save("Feedback séance mis à jour.").then(render);
  }
  function saveSessionFeedback(){
    const pending=state.ui.sessionFeedback, activityId=pending?.activityId, runId=pending?.runId;
    if(!pending||!activityId) return;
    const activity=state.activities.find(x=>x.id===activityId); if(!activity) return;
    const runState=state.sessionRuns.find(x=>x.id===runId);
    const easeScore=Number(el("sessionEaseScore")?.value)||null, backScore=Number(el("feedbackBack")?.value), kneeScore=Number(el("feedbackKnee")?.value), fatigueScore=Number(el("feedbackFatigue")?.value);
    activity.sessionEaseScore=easeScore;
    activity.quickBackScore=Number.isFinite(backScore)?backScore:null;
    activity.quickKneeScore=Number.isFinite(kneeScore)?kneeScore:null;
    activity.quickFatigueScore=Number.isFinite(fatigueScore)?fatigueScore:null;
    if(runState) runState.feedback={easeScore,backScore:activity.quickBackScore,kneeScore:activity.quickKneeScore,fatigueScore:activity.quickFatigueScore,updatedAt:new Date().toISOString()};
    applySessionFeedback(activity.profileId,{easeScore,backScore:activity.quickBackScore,kneeScore:activity.quickKneeScore,fatigueScore:activity.quickFatigueScore},runState);
    state.ui.sessionFeedback=null;
    state.ui.modal=null;
    save("Séance enregistrée et récupération prise en compte.").then(render);
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

  // Remplacer les croquis filaires par un diaporama SVG en boucle plus lisible.
  // Chaque exercice affiche une seule grande scène animée avec une silhouette
  // habillée, des repères de posture et des zones mises en évidence.
  function motionKind(x){
    if(["quad_set","straight_leg_raise","seated_knee_extension","standing_hamstring_curl","clamshell","hip_abduction_side"].includes(x.id)) return x.id;
    if(x.id==="glute_bridge") return "bridge";
    if(x.id==="calf_raise") return "calf";
    if(x.family==="cardio") return "cardio";
    if(x.family==="pull") return "pull";
    if(x.family==="push") return "push";
    if(x.family==="legs") return "hinge";
    if(x.family==="core") return ["dead_bug","bird_dog","front_plank","side_plank_knees","hollow_hold"].includes(x.id) ? x.id : "core";
    return "mobility";
  }

  function motionFrames(x){
    const kind=motionKind(x);
    const common={title:x.name, focus:targets(x).slice(0,3).join(" / ")};
    const frames={
      quad_set:{...common, posture:"Allongé sur le dos", prop:"serviette sous le genou", cues:["Mets la jambe longue","Écrase la serviette","Relâche sans à-coup"], poses:[
        {head:[82,158],neck:[112,162],hip:[222,176],lhand:[132,196],rhand:[168,196],lknee:[306,176],lfoot:[394,178],rknee:[308,178],rfoot:[398,180],extra:"towel"},
        {head:[82,158],neck:[112,162],hip:[222,172],lhand:[132,196],rhand:[168,196],lknee:[306,170],lfoot:[394,172],rknee:[308,172],rfoot:[398,174],extra:"press"},
        {head:[82,158],neck:[112,162],hip:[222,176],lhand:[132,196],rhand:[168,196],lknee:[306,176],lfoot:[394,178],rknee:[308,178],rfoot:[398,180],extra:"towel"}
      ]},
      straight_leg_raise:{...common, posture:"Allongé sur le dos", prop:"sol stable", cues:["Jambe gauche pliée, droite tendue","Monte la jambe droite tendue","Redescends la jambe droite tendue"], poses:[
        {head:[82,158],neck:[112,162],hip:[222,176],lhand:[132,196],rhand:[168,196],lknee:[282,138],lfoot:[346,196],rknee:[308,176],rfoot:[398,178]},
        {head:[82,158],neck:[112,162],hip:[222,176],lhand:[132,196],rhand:[168,196],lknee:[286,128],lfoot:[386,108],rknee:[308,176],rfoot:[398,178]},
        {head:[82,158],neck:[112,162],hip:[222,176],lhand:[132,196],rhand:[168,196],lknee:[290,150],lfoot:[380,148],rknee:[308,176],rfoot:[398,178]}
      ]},
      seated_knee_extension:{...common, posture:"Assis sur une chaise", prop:"chaise stable", cues:["Assis bien droit","Tends en contrôle","Redescends sans choc"], poses:[
        {head:[192,72],neck:[192,104],hip:[230,164],lhand:[152,150],rhand:[232,150],lknee:[304,198],lfoot:[308,266],rknee:[244,198],rfoot:[248,266],extra:"chair"},
        {head:[192,72],neck:[192,104],hip:[230,164],lhand:[152,150],rhand:[232,150],lknee:[304,198],lfoot:[408,198],rknee:[244,198],rfoot:[248,266],extra:"chair"},
        {head:[192,72],neck:[192,104],hip:[230,164],lhand:[152,150],rhand:[232,150],lknee:[304,198],lfoot:[372,228],rknee:[244,198],rfoot:[248,266],extra:"chair"}
      ]},
      standing_hamstring_curl:{...common, posture:"Debout avec appui", prop:"chaise ou barre", cues:["Tiens le support","Talon vers la fesse","Redescends en contrôle"], poses:[
        {head:[208,58],neck:[208,92],hip:[208,162],lhand:[150,136],rhand:[256,136],lknee:[184,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292],extra:"support"},
        {head:[208,58],neck:[208,92],hip:[208,162],lhand:[150,136],rhand:[256,136],lknee:[184,226],lfoot:[176,292],rknee:[232,226],rfoot:[298,188],extra:"support"},
        {head:[208,58],neck:[208,92],hip:[208,162],lhand:[150,136],rhand:[256,136],lknee:[184,226],lfoot:[176,292],rknee:[232,226],rfoot:[274,238],extra:"support"}
      ]},
      clamshell:{...common, posture:"Allongé sur le côté", prop:"tapis", cues:["Pieds ensemble","Ouvre le genou","Referme en gardant le bassin stable"], poses:[
        {head:[102,202],neck:[138,198],hip:[248,214],lhand:[146,232],rhand:[184,224],lknee:[308,246],lfoot:[378,260],rknee:[308,246],rfoot:[378,260]},
        {head:[102,202],neck:[138,198],hip:[248,214],lhand:[146,232],rhand:[184,224],lknee:[304,194],lfoot:[378,208],rknee:[308,246],rfoot:[378,260]},
        {head:[102,202],neck:[138,198],hip:[248,214],lhand:[146,232],rhand:[184,224],lknee:[306,222],lfoot:[378,234],rknee:[308,246],rfoot:[378,260]}
      ]},
      hip_abduction_side:{...common, posture:"Allongé sur le côté", prop:"tapis", cues:["Corps empilé","Monte la jambe du dessus","Redescends lentement"], poses:[
        {head:[102,202],neck:[138,198],hip:[248,214],lhand:[146,232],rhand:[184,224],lknee:[308,246],lfoot:[386,258],rknee:[308,214],rfoot:[392,214]},
        {head:[102,202],neck:[138,198],hip:[248,214],lhand:[146,232],rhand:[184,224],lknee:[308,246],lfoot:[386,258],rknee:[302,168],rfoot:[392,132]},
        {head:[102,202],neck:[138,198],hip:[248,214],lhand:[146,232],rhand:[184,224],lknee:[308,246],lfoot:[386,258],rknee:[306,188],rfoot:[392,164]}
      ]},
      bridge:{...common, posture:"Allongé sur le dos", prop:"pieds au sol", cues:["Pieds proches des fesses","Monte le bassin","Redescends sans cambrer"], poses:[
        {head:[86,186],neck:[120,190],hip:[246,214],lhand:[132,232],rhand:[176,232],lknee:[302,152],lfoot:[378,246],rknee:[338,156],rfoot:[418,246]},
        {head:[86,186],neck:[120,190],hip:[246,156],lhand:[132,232],rhand:[176,232],lknee:[302,152],lfoot:[378,246],rknee:[338,156],rfoot:[418,246]},
        {head:[86,186],neck:[120,190],hip:[246,186],lhand:[132,232],rhand:[176,232],lknee:[302,152],lfoot:[378,246],rknee:[338,156],rfoot:[418,246]}
      ]},
      calf:{...common, posture:"Debout face au mur", prop:"mur", cues:["Appui léger","Monte sur pointes","Descends lentement"], poses:[
        {head:[210,58],neck:[210,92],hip:[210,162],lhand:[164,132],rhand:[256,132],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292],extra:"wall"},
        {head:[210,44],neck:[210,78],hip:[210,148],lhand:[164,118],rhand:[256,118],lknee:[188,212],lfoot:[176,278],rknee:[232,212],rfoot:[246,278],extra:"wall"},
        {head:[210,58],neck:[210,92],hip:[210,162],lhand:[164,132],rhand:[256,132],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292],extra:"wall"}
      ]},
      push:{...common, posture:"Incliné sur support", prop:"support stable", cues:["Corps gainé","Descends en bloc","Repousse"], poses:[
        {head:[140,130],neck:[176,144],hip:[286,184],lhand:[194,258],rhand:[240,258],lknee:[326,232],lfoot:[414,252],rknee:[334,232],rfoot:[430,252],extra:"incline"},
        {head:[150,174],neck:[186,186],hip:[294,216],lhand:[194,262],rhand:[240,262],lknee:[326,240],lfoot:[414,258],rknee:[334,240],rfoot:[430,258],extra:"incline"},
        {head:[140,130],neck:[176,144],hip:[286,184],lhand:[194,258],rhand:[240,258],lknee:[326,232],lfoot:[414,252],rknee:[334,232],rfoot:[430,252],extra:"incline"}
      ]},
      pull:{...common, posture:"Debout avec élastique", prop:"élastique", cues:["Ancre solide","Tire les coudes","Retour contrôlé"], poses:[
        {head:[210,58],neck:[210,92],hip:[210,162],lhand:[308,136],rhand:[308,136],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292],extra:"band"},
        {head:[210,58],neck:[210,92],hip:[210,162],lhand:[246,140],rhand:[252,140],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292],extra:"band"},
        {head:[210,58],neck:[210,92],hip:[210,162],lhand:[280,138],rhand:[286,138],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292],extra:"band"}
      ]},
      cardio:{...common, posture:"Course facile sur plat", prop:"terrain plat", cues:["Petite foulée","Aisance respiratoire","Reste régulier"], poses:[
        {head:[178,64],neck:[178,96],hip:[154,164],lhand:[112,138],rhand:[220,126],lknee:[130,224],lfoot:[84,286],rknee:[192,216],rfoot:[252,256]},
        {head:[210,64],neck:[210,96],hip:[186,164],lhand:[252,138],rhand:[168,126],lknee:[232,216],lfoot:[290,256],rknee:[172,224],rfoot:[124,286]},
        {head:[242,64],neck:[242,96],hip:[218,164],lhand:[200,138],rhand:[286,126],lknee:[194,224],lfoot:[148,286],rknee:[258,216],rfoot:[316,256]}
      ]},
      dead_bug:{...common, posture:"Allongé sur le dos", prop:"tapis", cues:["Dos plaqué","Bras et jambe opposés","Retour lent"], poses:[
        {head:[90,186],neck:[124,190],hip:[248,210],lhand:[188,122],rhand:[246,120],lknee:[246,128],lfoot:[312,128],rknee:[320,132],rfoot:[382,132]},
        {head:[90,186],neck:[124,190],hip:[248,210],lhand:[116,136],rhand:[246,120],lknee:[246,128],lfoot:[312,128],rknee:[356,204],rfoot:[432,222]},
        {head:[90,186],neck:[124,190],hip:[248,210],lhand:[188,122],rhand:[150,136],lknee:[312,204],lfoot:[386,222],rknee:[320,132],rfoot:[382,132]}
      ]},
      bird_dog:{...common, posture:"À quatre pattes", prop:"tapis", cues:["Mains et genoux au sol","Allonge opposés","Bassin stable"], poses:[
        {head:[126,118],neck:[160,134],hip:[280,172],lhand:[164,252],rhand:[222,252],lknee:[278,252],lfoot:[258,288],rknee:[338,252],rfoot:[368,288]},
        {head:[126,118],neck:[160,134],hip:[280,172],lhand:[84,164],rhand:[222,252],lknee:[278,252],lfoot:[258,288],rknee:[392,158],rfoot:[452,136]},
        {head:[126,118],neck:[160,134],hip:[280,172],lhand:[164,252],rhand:[286,164],lknee:[198,158],lfoot:[138,136],rknee:[338,252],rfoot:[368,288]}
      ]},
      front_plank:{...common, posture:"Planche sur avant-bras", prop:"tapis", cues:["Coudes sous épaules","Corps aligné","Respire"], poses:[
        {head:[136,136],neck:[172,150],hip:[286,182],lhand:[168,256],rhand:[204,256],lknee:[326,226],lfoot:[432,244],rknee:[336,226],rfoot:[448,244]},
        {head:[136,128],neck:[172,142],hip:[286,174],lhand:[168,256],rhand:[204,256],lknee:[326,226],lfoot:[432,244],rknee:[336,226],rfoot:[448,244]},
        {head:[136,136],neck:[172,150],hip:[286,182],lhand:[168,256],rhand:[204,256],lknee:[326,226],lfoot:[432,244],rknee:[336,226],rfoot:[448,244]}
      ]},
      side_plank_knees:{...common, posture:"Planche latérale genoux", prop:"tapis", cues:["Appui coude","Monte le bassin","Garde l’alignement"], poses:[
        {head:[156,188],neck:[192,194],hip:[278,212],lhand:[186,258],rhand:[236,218],lknee:[324,244],lfoot:[392,258],rknee:[338,250],rfoot:[408,266]},
        {head:[156,166],neck:[192,172],hip:[278,176],lhand:[186,258],rhand:[236,196],lknee:[324,208],lfoot:[392,240],rknee:[338,214],rfoot:[408,248]},
        {head:[156,188],neck:[192,194],hip:[278,212],lhand:[186,258],rhand:[236,218],lknee:[324,244],lfoot:[392,258],rknee:[338,250],rfoot:[408,266]}
      ]},
      hollow_hold:{...common, posture:"Allongé sur le dos", prop:"sol", cues:["Dos collé","Allonge bras et jambes","Arrête si le dos creuse"], poses:[
        {head:[92,186],neck:[126,190],hip:[248,212],lhand:[188,136],rhand:[236,132],lknee:[290,154],lfoot:[364,166],rknee:[314,164],rfoot:[390,182]},
        {head:[92,186],neck:[126,190],hip:[248,212],lhand:[118,132],rhand:[160,124],lknee:[326,206],lfoot:[430,226],rknee:[344,216],rfoot:[454,242]},
        {head:[92,186],neck:[126,190],hip:[248,212],lhand:[154,138],rhand:[198,134],lknee:[304,178],lfoot:[398,196],rknee:[324,188],rfoot:[420,212]}
      ]},
      hinge:{...common, posture:"Debout", prop:"sol ou chaise derrière", cues:["Hanches vers l’arrière","Buste long","Reviens debout"], poses:[
        {head:[210,58],neck:[210,92],hip:[210,162],lhand:[174,158],rhand:[246,158],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292]},
        {head:[266,98],neck:[254,128],hip:[210,174],lhand:[226,172],rhand:[294,172],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292]},
        {head:[210,58],neck:[210,92],hip:[210,162],lhand:[174,158],rhand:[246,158],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292]}
      ]},
      core:{...common, posture:"Au sol", prop:"tapis", cues:["Installe-toi","Gaine proprement","Respire"], poses:[
        {head:[150,126],neck:[184,144],hip:[274,182],lhand:[170,248],rhand:[222,248],lknee:[280,236],lfoot:[344,274],rknee:[330,234],rfoot:[392,274]},
        {head:[150,116],neck:[184,132],hip:[274,166],lhand:[136,186],rhand:[254,186],lknee:[280,212],lfoot:[344,260],rknee:[330,212],rfoot:[392,260]},
        {head:[150,126],neck:[184,144],hip:[274,182],lhand:[170,248],rhand:[222,248],lknee:[280,236],lfoot:[344,274],rknee:[330,234],rfoot:[392,274]}
      ]},
      mobility:{...common, posture:"Amplitude douce", prop:"mouvement contrôlé", cues:["Place-toi","Bouge lentement","Respire"], poses:[
        {head:[210,58],neck:[210,92],hip:[210,162],lhand:[156,136],rhand:[264,136],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292]},
        {head:[250,72],neck:[244,104],hip:[210,162],lhand:[168,124],rhand:[320,90],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292]},
        {head:[168,72],neck:[174,104],hip:[210,162],lhand:[100,90],rhand:[252,124],lknee:[188,226],lfoot:[176,292],rknee:[232,226],rfoot:[246,292]}
      ]}
    };
    return frames[kind]||frames.mobility;
  }

  function motionPalette(gender){
    return gender==="female"
      ? {skin:"#f2c3ac",skinLine:"#8d5e4d",shirt:"#1f6f8b",shorts:"#233147",hair:"#2d2430"}
      : {skin:"#efbf9f",skinLine:"#8b614f",shirt:"#2d7f64",shorts:"#1d2d38",hair:"#2a292b"};
  }

  function motionExtra(p){
    if(p.extra==="chair") return `<g class="motionSceneProp"><rect x="214" y="146" width="86" height="20" rx="8"/><path d="M224 166v104M286 166v104" class="motionPropLine"/><path d="M300 166v104" class="motionPropLine"/></g>`;
    if(p.extra==="support") return `<g class="motionSceneProp"><rect x="106" y="130" width="74" height="14" rx="7"/><path d="M118 144v130M158 144v130" class="motionPropLine"/></g>`;
    if(p.extra==="wall") return `<g class="motionSceneProp"><path d="M126 46v258" class="motionPropLine"/><path d="M114 58h24M114 98h24M114 138h24M114 178h24M114 218h24" class="motionPropLine thin"/></g>`;
    if(p.extra==="band") return `<g class="motionSceneProp"><path d="M314 132 C288 148 254 150 232 140" class="motionBand"/><circle cx="322" cy="132" r="7" class="motionAnchor"/></g>`;
    if(p.extra==="incline") return `<g class="motionSceneProp"><path d="M194 264h102v-74h20v74h98v16H194z"/></g>`;
    if(p.extra==="towel"||p.extra==="press") return `<path d="M284 184 q28 ${p.extra==="press"?2:12} 64 0" class="motionTowel"/>`;
    return "";
  }

  function motionAvatar(p, gender, kind){
    const q=k=>p[k], palette=motionPalette(gender), hair=gender==="female"
      ? `<path d="M${q("head")[0]-16} ${q("head")[1]-8} q-16 22 6 38" fill="none" stroke="${palette.hair}" stroke-width="10" stroke-linecap="round"/>`
      : `<path d="M${q("head")[0]-12} ${q("head")[1]-11} q12 -10 24 0" fill="none" stroke="${palette.hair}" stroke-width="10" stroke-linecap="round"/>`;
    const limb=(a,b,width)=>`<line x1="${q(a)[0]}" y1="${q(a)[1]}" x2="${q(b)[0]}" y2="${q(b)[1]}" stroke="${palette.skin}" stroke-width="${width}" stroke-linecap="round"/><line x1="${q(a)[0]}" y1="${q(a)[1]}" x2="${q(b)[0]}" y2="${q(b)[1]}" stroke="${palette.skinLine}" stroke-width="${Math.max(4,width/4)}" stroke-linecap="round" opacity=".42"/>`;
    const shirt=`<path d="M${q("neck")[0]-28} ${q("neck")[1]+4} Q ${q("neck")[0]} ${q("neck")[1]-12} ${q("neck")[0]+28} ${q("neck")[1]+4} L ${q("hip")[0]+18} ${q("hip")[1]-8} Q ${q("hip")[0]} ${q("hip")[1]+18} ${q("hip")[0]-18} ${q("hip")[1]-8} Z" fill="${palette.shirt}" opacity=".96"/>`;
    const shorts=`<path d="M${q("hip")[0]-24} ${q("hip")[1]-2} L ${q("hip")[0]+24} ${q("hip")[1]-2} L ${q("hip")[0]+18} ${q("hip")[1]+28} L ${q("hip")[0]-18} ${q("hip")[1]+28} Z" fill="${palette.shorts}"/>`;
    return `<g class="motionFigure">
      ${motionExtra(p)}
      ${shirt}
      ${shorts}
      ${limb("neck","lhand",18)}${limb("neck","rhand",18)}
      ${limb("hip","lknee",22)}${limb("lknee","lfoot",18)}
      ${limb("hip","rknee",22)}${limb("rknee","rfoot",18)}
      <line x1="${q("neck")[0]}" y1="${q("neck")[1]}" x2="${q("hip")[0]}" y2="${q("hip")[1]}" stroke="${palette.skin}" stroke-width="28" stroke-linecap="round"/>
      <line x1="${q("neck")[0]}" y1="${q("neck")[1]}" x2="${q("hip")[0]}" y2="${q("hip")[1]}" stroke="${palette.skinLine}" stroke-width="6" stroke-linecap="round" opacity=".4"/>
      <circle cx="${q("head")[0]}" cy="${q("head")[1]}" r="22" fill="${palette.skin}"/>
      <circle cx="${q("head")[0]}" cy="${q("head")[1]}" r="22" fill="none" stroke="${palette.skinLine}" stroke-width="4" opacity=".45"/>
      ${hair}
      <circle cx="${q("lhand")[0]}" cy="${q("lhand")[1]}" r="7" fill="${palette.skin}" stroke="${palette.skinLine}" stroke-width="2" opacity=".9"/>
      <circle cx="${q("rhand")[0]}" cy="${q("rhand")[1]}" r="7" fill="${palette.skin}" stroke="${palette.skinLine}" stroke-width="2" opacity=".9"/>
      <ellipse cx="${q("lfoot")[0]}" cy="${q("lfoot")[1]+4}" rx="13" ry="8" class="motionShoe"/>
      <ellipse cx="${q("rfoot")[0]}" cy="${q("rfoot")[1]+4}" rx="13" ry="8" class="motionShoe"/>
    </g>`;
  }

  function sceneOpacity(index){
    const values=[
      "1;1;0;0;0;1",
      "0;0;1;1;0;0",
      "0;0;0;0;1;0"
    ][index];
    return `<animate attributeName="opacity" dur="4.8s" repeatCount="indefinite" values="${values}" keyTimes="0;0.24;0.33;0.57;0.66;1"/>`;
  }

  function motionScene(frame,index,gender,color,kind){
    const stepTitles=["Départ","Mouvement","Retour"];
    return `<g class="motionScene" opacity="${index===0?1:0}">
      ${sceneOpacity(index)}
      <rect x="24" y="54" width="466" height="252" rx="22" class="motionSceneBg"/>
      <path d="M52 274h408" class="motionGround"/>
      ${motionAvatar(frame, gender, kind)}
      <rect x="318" y="72" width="150" height="36" rx="18" fill="${color}" opacity=".13"/>
      <text x="392" y="95" text-anchor="middle" class="motionStage">${stepTitles[index]}</text>
      <text x="56" y="300" class="motionPosture">${esc(frame.cue)}</text>
    </g>`;
  }

  function diagram(x){
    const data=motionFrames(x), kind=motionKind(x), gender=mediaGenderChoice();
    const color={core:"#2d8cff",push:"#f57b45",pull:"#735cff",legs:"#24c05a",knee_rehab:"#19a974",mobility:"#8bbf2d",cardio:"#ff4d57",warmup:"#49a99a",cooldown:"#8a9691"}[x.family]||"#2d8cff";
    const scenes=data.poses.map((pose,i)=>motionScene({...pose,cue:data.cues[i]},i,gender,color,kind)).join("");
    return `<svg class="motionSvg" viewBox="0 0 520 338" role="img" aria-label="Diaporama offline ${esc(x.name)}">
      <defs>
        <linearGradient id="motionBackdrop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f7fbf8"/>
          <stop offset="100%" stop-color="#edf5f0"/>
        </linearGradient>
      </defs>
      <rect width="520" height="338" rx="22" class="motionBg"/>
      <rect x="0" y="0" width="520" height="338" rx="22" fill="url(#motionBackdrop)" opacity=".92"/>
      <text x="24" y="30" class="motionTitle">${esc(x.name)}</text>
      <text x="24" y="48" class="motionMeta">${esc(data.posture)} · ${esc(data.prop)}</text>
      ${scenes}
    </svg>`;
  }
  globalThis.__resurgoExerciseDiagram = diagram;

  // Brancher ici tous les événements DOM.
  // Ce module reste le point d'entrée final du bundle applicatif.
    }catch{}
    render();
  }
  function registerPwaEvents(){
    window.addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); deferredInstallPrompt=e; render(); });
    window.addEventListener("appinstalled",async()=>{ deferredInstallPrompt=null; state.settings.hideInstallPrompt=true; await save("App installée."); render(); if(state.settings.notifications.enabled&&notificationPermission()==="default"&&!state.settings.notifications.askedOnInstall) await requestSessionNotifications({test:false,silent:true}); });
    navigator.serviceWorker?.addEventListener("message", e=>{
      if(e.data?.type==="OPEN_VIEW"){ state.ui.view=e.data.view||"today"; save().then(render); }
      if(e.data?.type==="RESURGO_PUSH")pushInboxLoad().catch(()=>{});
    });
    let refreshing=false;
    navigator.serviceWorker?.addEventListener("controllerchange",()=>{ if(refreshing) return; refreshing=true; window.location.reload(); });
  }
  async function registerServiceWorker(){
    if(!("serviceWorker" in navigator)) return;
    swRegistration=await navigator.serviceWorker.register(`./sw.js?build=${encodeURIComponent(APP_BUILD)}`,{updateViaCache:"none"}).catch(()=>null);
    if(!swRegistration) return;
    if(swRegistration.waiting){ updateWaiting=swRegistration.waiting; applyHotUpdate(); }
    swRegistration.addEventListener("updatefound",()=>{ const nw=swRegistration.installing; if(!nw) return; nw.addEventListener("statechange",()=>{ if(nw.state==="installed"&&navigator.serviceWorker.controller){ updateWaiting=nw; applyHotUpdate(); } }); });
    await checkOnlineVersion();
    scheduleSessionReminder();
  }
  function saveQuickCheck(silent=true){ const p=profile(); if(!p) return; p.health.backPain=loadScore("quickBack"); p.health.kneePain=loadScore("quickKnee"); p.health.tendonPain=loadScore("quickKnee"); p.health.fatigue=loadScore("quickFatigue"); save(silent?"":"Check rapide enregistré."); }
  function saveProfileFields({regen=false,msg=""}={}){
    const p=profile(); if(!p) return;
    p.name=text("profileName")||p.name; p.gender=el("gender")?.value||p.gender||"male"; p.mediaGender=el("mediaGender")?.value||p.mediaGender||p.gender||"male"; p.age=num("age")??p.age; p.heightCm=num("heightCm")??p.heightCm; p.startWeightKg=num("startWeightKg")??p.startWeightKg; p.targetWeightKg=num("targetWeightKg")??p.targetWeightKg; p.targetMonths=num("targetMonths")??p.targetMonths??6; p.availabilityDays=Number(el("availabilityDays")?.value)===7?7:5; p.goalFocus=el("goalFocus")?.value||p.goalFocus||"global"; p.sportsHistory=text("sportsHistory");
    normalizeGoal(p);
    p.health.backPain=loadScore("profileBack");
    p.health.kneePain=loadScore("profileKnee");
    p.health.tendonPain=loadScore("profileKnee");
    p.health.fatigue=loadScore("profileFatigue");
    p.health.irradiating=!!el("irradiating")?.checked;
    p.health.neurological=!!el("neurological")?.checked;
    Object.keys(levels).forEach(k=>{ const x=el(`level_${k}`); if(x) p.levels[k]=x.value; });
    if(regen) makeWeek(p.id);
    save(msg);
  }
  function saveTtsSettings(){ state.settings.tts.enabled=el("ttsEnabled")?.value==="true"; state.settings.tts.rate=n("ttsRate")||1; state.settings.tts.volume=n("ttsVolume"); save(); }
  function saveWorkerSettings(){ state.settings.workerUrl=text("workerUrl"); state.settings.workerToken=el("workerToken")?.value||""; save(); }
  function saveExerciseSettings(id){
    state.exerciseVideos=state.exerciseVideos||{};
    state.exerciseMetaOverrides=state.exerciseMetaOverrides||{};
    const video=text(`video_${id}`), base=ex.find(x=>x.id===id), role=el(`role_${id}`)?.value||base?.training?.role||"strength", load=el(`load_${id}`)?.value||base?.training?.load||"moderate";
    if(video) state.exerciseVideos[id]=video; else delete state.exerciseVideos[id];
    if(base&&(role!==base.training.role||load!==base.training.load)) state.exerciseMetaOverrides[id]={...state.exerciseMetaOverrides[id],role,load};
    else delete state.exerciseMetaOverrides[id];
    save("Exercice mis à jour.").then(render);
  }
  async function saveNotificationSettings(){
    state.settings.notifications.enabled=!!el("notifEnabled")?.checked;
    state.settings.notifications.reminderTime=el("notifTime")?.value||"08:00";
    const stateText=el("notifEnabled")?.nextElementSibling?.querySelector(".switchState");
    if(stateText) stateText.textContent=state.settings.notifications.enabled?"Oui":"Non";
    if(state.settings.notifications.enabled&&notificationPermission()!=="granted"){
      await requestSessionNotifications({test:false,rerender:false});
      const refreshedText=el("notifEnabled")?.nextElementSibling?.querySelector(".switchState");
      if(refreshedText) refreshedText.textContent=state.settings.notifications.enabled?"Oui":"Non";
    }else{
      await save();
    }
    const status=el("notificationStatus");
    if(status) status.textContent=notificationStatusText();
    scheduleSessionReminder();
    pushUpdateReminderSetting().catch(err=>
      console.warn("Rappel NAS non synchronisé, réessayer avec la connexion NAS",err?.message));
  }
  function confirmTwice(first,second){ return confirm(first)&&confirm(second); }
  function placeSmileyMenu(details){
    const menu=details?.querySelector(".smileyChoices"), summary=details?.querySelector("summary");
    if(!menu||!summary) return;
    menu.style.top=""; menu.style.left=""; menu.style.right=""; menu.style.width=""; menu.style.transform="";
    if(window.matchMedia("(max-width: 430px)").matches){
      const box=summary.getBoundingClientRect();
      menu.style.top=`${Math.min(box.bottom+6, window.innerHeight-menu.offsetHeight-12)}px`;
    }
  }
  // ResurGo Backup v2 — fichiers JSON chiffrés et récupération de profil NAS.
  // Le mot de passe est utilisé uniquement dans ce navigateur ; jamais envoyé au serveur.
  const RESURGO_BACKUP_FORMAT = "resurgo-encrypted-backup";
  const RESURGO_BACKUP_ITERATIONS = 310000;
  const backupEnc = new TextEncoder(), backupDec = new TextDecoder();
  function backupB64(bytes){
    let s="";
    for(let i=0;i<bytes.length;i+=32768)
      s+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return btoa(s);
  }
  function backupUn64(str){
    if(typeof str!=="string"||str.length>40*1024*1024) throw Error("Encodage de sauvegarde invalide.");
    return Uint8Array.from(atob(str),x=>x.charCodeAt(0));
  }
  function backupRandom(n){return crypto.getRandomValues(new Uint8Array(n));}
  function backupCryptoAvailable(){
    if(!globalThis.isSecureContext||!crypto?.subtle)throw Error("Chiffrement indisponible : utiliser HTTPS sur un navigateur compatible.");
  }
  async function backupDerive(password,salt,iterations=RESURGO_BACKUP_ITERATIONS){
    const keyMaterial=await crypto.subtle.importKey("raw",backupEnc.encode(password),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations},
      keyMaterial,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  }
  function backupDownload(obj){
    const blob=new Blob([JSON.stringify(obj)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="ResurGo-sauvegarde-chiffree-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  function backupCleanState(snapshot){
    const data=clone(snapshot);
    if(data?.settings){
      delete data.settings.workerToken;
      delete data.settings.nasToken;
      delete data.settings.deviceToken;
      delete data.settings.recoverySecret;
    }
    if(data?.ui){data.ui.message="";data.ui.modal=null;}
    return data;
  }
  function validateResurgoSnapshot(snapshot){
    if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot)||
       !Array.isArray(snapshot.profiles)||!Array.isArray(snapshot.plans)||
       !Array.isArray(snapshot.activities)||!Array.isArray(snapshot.sessionRuns)||
       !Array.isArray(snapshot.metrics)||!snapshot.settings||
       typeof snapshot.settings!=="object")
      throw Error("La sauvegarde ne contient pas un état ResurGo complet.");
    if(snapshot.profiles.length>10000||snapshot.activities.length>100000)
      throw Error("Taille logique de sauvegarde anormale.");
    return backupCleanState(snapshot);
  }
  function nasUrlFromInput(){
    const input=el("nasSyncUrl")?.value?.trim()||state.settings?.nasSyncUrl||"";
    if(!input)return "";
    const url=new URL(input);
    if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)
      throw Error("Utiliser uniquement une adresse HTTPS du service NAS, sans identifiants ni paramètres.");
    return url.href.replace(/\/$/,"");
  }
  async function nasStoredConnection(){return (await get("nasConnection"))||null;}
  async function nasRequest(base,path,{method="GET",token=null,payload=null}={}){
    const ctrl=new AbortController();
    const timeout=setTimeout(()=>ctrl.abort(),15000);
    try{
      const res=await fetch(base+path,{method,cache:"no-store",signal:ctrl.signal,
        headers:{"Content-Type":"application/json",...(token?{"Authorization":"Bearer "+token}:{})},
        ...(payload===null?{}:{body:JSON.stringify(payload)})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw Error("Serveur NAS : requête refusée (HTTP "+res.status+").");
      return data;
    }finally{clearTimeout(timeout);}
  }
  async function nasCreateProfile(){
    try{
      const url=nasUrlFromInput();
      const name=el("nasProfileName")?.value?.trim()||profile()?.name||"Profil sportif";
      const label=el("nasDeviceName")?.value?.trim()||"Premier appareil ResurGo";
      if(!url)throw Error("Renseigner l'URL HTTPS du NAS.");
      if(!name.trim())throw Error("Donner un nom au profil.");
      const connected=await nasStoredConnection();
      if(connected?.token)throw Error("Appareil déjà associé. Utiliser le jumelage ou la restauration.");
      if(!confirm("Créer un nouveau profil NAS indépendant sans administrateur ? Les entraînements, poids, ressenti et informations de récupération de ce profil seront synchronisés via Funnel HTTPS et stockés sur ton NAS. Tu restes libre de continuer seulement en local."))return;
      const data=await nasRequest(url,"/api/v1/profiles/create",{method:"POST",
        payload:{profileName:name,deviceName:label}});
      if(!data.profileId||!data.token||!data.recovery?.secret)
        throw Error("Le NAS n'a pas confirmé la création du profil sécurisé.");
      await put("nasConnection",{url,profileId:data.profileId,deviceId:data.deviceId,
        token:data.token,recovery:data.recovery,label,profileName:data.profileName,
        accountRole:"owner",localProfileId:state.activeProfileId});
      state.settings.nasSyncUrl=url;
      await save("Profil NAS créé sans administrateur. Exporte maintenant une sauvegarde chiffrée.");
      render();
    }catch(err){alert(err.message||"Inscription autonome au NAS impossible.");}
  }
  async function nasPairWithCode(){
    try{
      const url=nasUrlFromInput(),code=el("nasPairCodeInput")?.value?.trim().toUpperCase();
      const label=el("nasDeviceName")?.value?.trim()||"Appareil ResurGo";
      if(!url||!code)throw Error("Renseigner l'URL HTTPS NAS et le code d'association.");
      const previous=await nasStoredConnection();
      if(previous?.token&&!confirm("Cet appareil est déjà associé à un profil NAS. Remplacer sa connexion ?"))
        return;
      const data=await nasRequest(url,"/api/v1/pair/redeem",{method:"POST",payload:{code,label}});
      if(!data.token||!data.recovery?.keyId||!data.recovery?.secret)
        throw Error("Le serveur ne fournit pas de clé de secours ; association non enregistrée.");
      await put("nasConnection",{url,profileId:data.profileId,deviceId:data.deviceId,
        token:data.token,recovery:data.recovery,label,accountRole:"paired"});
      await put("nasPendingRecovery",null);
      state.settings.nasSyncUrl=url;
      await save("NAS associé à cet appareil. Crée une sauvegarde chiffrée avec ta clé de secours.");
      render();
    }catch(err){alert(err.message||"Association NAS impossible.");}
  }
  async function nasGeneratePairCode(){
    try{
      const connected=await nasStoredConnection();
      if(!connected?.token)throw Error("Associer d'abord cet appareil au NAS.");
      const data=await nasRequest(connected.url,"/api/v1/pair/start",{
        method:"POST",token:connected.token,payload:{label:"Nouvel appareil"}});
      if(!data.code)throw Error("Aucun code reçu.");
      const target=el("nasPairOutput");if(target)target.textContent=
        "Code à usage unique : "+data.code+" (expire dans 10 minutes).";
    }catch(err){alert(err.message||"Impossible de générer le code.");}
  }
  async function nasRetryRecovery(){
    try{
      const pending=await get("nasPendingRecovery");
      if(!pending?.recovery?.keyId||!pending.recovery.secret)
        throw Error("Aucune restauration NAS en attente.");
      const url=new URL(pending.url);
      if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)
        throw Error("URL NAS non valide.");
      const base=url.href.replace(/\/$/,"");
      const label=el("nasDeviceName")?.value?.trim()||"Appareil ResurGo restauré";
      const recovered=await nasRequest(base,"/api/v1/recovery/redeem",{
        method:"POST",payload:{profileId:pending.profileId,
          keyId:pending.recovery.keyId,secret:pending.recovery.secret,label}
      });
      if(!recovered?.token||!recovered?.recovery?.secret)
        throw Error("Réassociation NAS incomplète.");
      await put("nasConnection",{url:base,profileId:recovered.profileId,
        deviceId:recovered.deviceId,token:recovered.token,recovery:recovered.recovery,label});
      await put("nasPendingRecovery",null);
      state.settings.nasSyncUrl=base;
      await save("Réassociation NAS réussie. Effectuer une nouvelle sauvegarde chiffrée.");
      render();
    }catch(err){alert(err.message||"Récupération NAS impossible pour le moment.");}
  }
  async function nasTestConnection(){
    try{
      const conn=await nasStoredConnection();
      if(!conn?.token)throw Error("Pas d'appareil NAS associé.");
      const data=await nasRequest(conn.url,"/api/v1/devices",{token:conn.token});
      const meta=await nasSyncLoadMeta(conn);
      alert("Connexion NAS vérifiée. "+(data.devices||[]).length+
        " appareil(s) associé(s). Profils détectés sur NAS : "+
        (meta.remoteProfileIds?.length||0)+". Synchronisation local-first disponible ; "+
        "consulter le statut ci-dessous pour les erreurs ou opérations en attente.");
    }catch(err){alert(err.message||"NAS inaccessible.");}
  }
  async function exportEncryptedBackup(){
    try{
      backupCryptoAvailable();
      const password=el("backupPassword")?.value||"";
      const verify=el("backupPasswordConfirm")?.value||"";
      if(password.length<12)throw Error("Choisir une phrase de passe d'au moins 12 caractères.");
      if(password!==verify)throw Error("Les deux mots de passe sont différents.");
      const connection=await nasStoredConnection();
      const payload={
        backupVersion:2,
        createdAt:new Date().toISOString(),
        appVersion:APP_VERSION,
        state:validateResurgoSnapshot(state),
        nas:connection?.recovery?.secret ? {
          url:connection.url,profileId:connection.profileId,recovery:connection.recovery
        }:null
      };
      const salt=backupRandom(16),iv=backupRandom(12);
      const key=await backupDerive(password,salt);
      const clear=backupEnc.encode(JSON.stringify(payload));
      const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,clear);
      backupDownload({format:RESURGO_BACKUP_FORMAT,version:2,
        kdf:{name:"PBKDF2",hash:"SHA-256",iterations:RESURGO_BACKUP_ITERATIONS,salt:backupB64(salt)},
        cipher:{name:"AES-256-GCM",iv:backupB64(iv)},
        ciphertext:backupB64(new Uint8Array(cipher))});
      el("backupPassword").value="";el("backupPasswordConfirm").value="";
      await save("Sauvegarde chiffrée exportée. Conserve bien son mot de passe.");
      render();
    }catch(err){alert(err.message||"Export chiffré impossible.");}
  }
  async function restoreEncryptedBackup(file){
    if(!file)return;
    try{
      backupCryptoAvailable();
      if(file.size>25*1024*1024)throw Error("Sauvegarde supérieure à 25 Mo.");
      const password=el("backupRestorePassword")?.value||"";
      if(!password)throw Error("Saisir le mot de passe de la sauvegarde.");
      let envelope;try{envelope=JSON.parse(await file.text());}catch{throw Error("Fichier JSON invalide.");}
      if(envelope?.format!==RESURGO_BACKUP_FORMAT||envelope.version!==2||
        envelope.kdf?.name!=="PBKDF2"||envelope.kdf?.hash!=="SHA-256"||
        envelope.cipher?.name!=="AES-256-GCM")
        throw Error("Format de sauvegarde chiffrée ResurGo non reconnu.");
      const iterations=envelope.kdf.iterations;
      if(!Number.isInteger(iterations)||iterations<200000||iterations>1000000)
        throw Error("Paramètres KDF non valides.");
      const salt=backupUn64(envelope.kdf.salt),iv=backupUn64(envelope.cipher.iv);
      if(salt.length!==16||iv.length!==12)throw Error("Paramètres du chiffrement non valides.");
      const key=await backupDerive(password,salt,iterations);
      let clear;
      try{clear=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,backupUn64(envelope.ciphertext));}
      catch{throw Error("Mot de passe incorrect ou fichier altéré.");}
      let payload;try{payload=JSON.parse(backupDec.decode(clear));}
      catch{throw Error("Le JSON déchiffré est invalide.");}
      if(payload?.backupVersion!==2)throw Error("Version de données non reconnue.");
      const snapshot=validateResurgoSnapshot(payload.state);
      if(!confirm("Remplacer les données locales ResurGo de cet appareil par la sauvegarde ? "+
        "L'état local actuel sera perdu. Effectuer d'abord un export de sécurité si nécessaire."))
        return;
      // Une seule écriture de snapshot ; aucune connexion réseau n'est nécessaire à ce stade.
      const existing=await nasStoredConnection();
      if(existing?.profileId&&payload.nas?.profileId&&
        existing.profileId!==payload.nas.profileId)
        throw Error("Cet appareil est lié à un autre profil NAS. Dissocier ce profil avant restauration.");
      const fresh={...clone(empty),...snapshot,
        settings:{...empty.settings,...snapshot.settings,
          workerToken:"",nasToken:"",deviceToken:"",recoverySecret:"",
          notifications:{...empty.settings.notifications,...(snapshot.settings.notifications||{})},
          tts:{...empty.settings.tts,...(snapshot.settings.tts||{})}},
        ui:{...empty.ui,...snapshot.ui,view:"today",message:""}};
      await put("app",fresh);
      state=fresh;
      // Ne jamais conserver une ancienne session NAS sur un jeu de données restauré :
      // elle pourrait ensuite provoquer une synchronisation vers le mauvais profil.
      await put("nasConnection",null);
      await put("nasPendingRecovery",null);
      // Tokens d'appareils NE SONT PAS sauvegardés : réinscription via secret de récupération.
      if(payload.nas?.recovery?.keyId&&payload.nas.recovery.secret){
        try{
          const url=new URL(payload.nas.url);
          if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)
            throw Error("URL NAS non sûre.");
          const base=url.href.replace(/\/$/,"");
          const recovered=await nasRequest(base,"/api/v1/recovery/redeem",{method:"POST",payload:{
            profileId:payload.nas.profileId,keyId:payload.nas.recovery.keyId,
            secret:payload.nas.recovery.secret,
            label:"Appareil restauré"
          }});
          if(!recovered?.recovery?.secret||!recovered?.token)
            throw Error("Réassociation NAS incomplète.");
          await put("nasConnection",{url:base,profileId:recovered.profileId,
            deviceId:recovered.deviceId,token:recovered.token,recovery:recovered.recovery,
            label:"Appareil restauré",localProfileId:state.activeProfileId});
          await put("nasPendingRecovery",null);
          state.settings.nasSyncUrl=base;
          await put("app",state);
          alert("Sauvegarde restaurée et nouvel appareil associé au NAS. "+
            "Crée une nouvelle sauvegarde chiffrée pour protéger sa nouvelle clé de secours.");
        }catch(err){
          // Restauration locale terminée même si le réseau ou NAS échoue.
          // Conserver séparément la capacité de récupération, afin de pouvoir
          // reprendre la réassociation même si TOUS les anciens appareils ont disparu.
          await put("nasPendingRecovery",payload.nas);
          alert("Sauvegarde locale restaurée. Réassociation NAS différée : "+
            (err.message||"réseau indisponible")+
            ". Tu pourras utiliser « Reprendre la récupération NAS » sans administrateur.");
        }
      }else{
        alert("Sauvegarde locale restaurée. Aucun secret NAS contenu dans ce fichier.");
      }
      render();
    }catch(err){alert(err.message||"Restauration impossible.");}
    finally{const input=el("restoreEncryptedJson");if(input)input.value="";}
  }

  // ResurGo Sync v0.2 — IndexedDB-first; canonical profile entities and CAS conflicts.
  // Production requires Safari and real NAS acceptance tests.
  let nasSyncBusy=false, nasSyncDelay=null, nasSyncStarted=false, nasApplyingRemote=false;
  const nasKinds=[
    ["profiles","profile_settings"],
    ["plans","plan"],["activities","activity"],["metrics","measurement"],
    ["sessionRuns","record"],["assessments","feedback"]
  ];
  const nasEntityKey=(kind,id)=>kind+":"+id;
  function nasOwnProfileItems(profileIds){
    const allowed=new Set(profileIds||[]);
    if(!allowed.size)return [];
    const result=[];
    for(const [field,kind] of nasKinds){
      if(!Array.isArray(state[field]))continue;
      for(const item of state[field]){
        if(!item?.id)continue;
        if(!allowed.has(field==="profiles"?item.id:item.profileId))continue;
        const payload=kind==="profile_settings"?{profile:clone(item)}:clone(item);
        result.push({kind,entityId:String(item.id),payload,field});
      }
    }
    return result;
  }
  // One NAS account may contain several local sports profiles. The initial
  // owner can enroll every local profile. A newly paired device only uploads
  // profiles already seen on this NAS, not an unrelated local starter profile.
  function nasSyncEligibleProfileIds(conn,meta){
    const local=(state.profiles||[]).filter(x=>x?.id).map(x=>x.id);
    const isOriginalOwner=conn?.accountRole==="owner" || !!conn?.profileName;
    if(isOriginalOwner)return local;
    const remote=new Set(meta.remoteProfileIds||[]);
    return local.filter(id=>remote.has(id));
  }
  function nasLocalFingerprint(value){return JSON.stringify(value);}
  async function nasSyncLoadMeta(conn){
    const stored=await get("nasSyncMeta");
    if(stored?.profileId===conn.profileId && stored.deviceId===conn.deviceId){
      if(!Array.isArray(stored.remoteProfileIds))stored.remoteProfileIds=[];
      return stored;
    }
    const initial={profileId:conn.profileId,deviceId:conn.deviceId,cursor:0,
      revisions:{},hashes:{},outbox:[],conflicts:[],initialized:false,
      syncLastAt:null,error:null,remoteProfileIds:[]};
    await put("nasSyncMeta",initial);
    return initial;
  }
  function nasSyncRemoteCollection(kind){
    return nasKinds.find(x=>x[1]===kind)?.[0]||null;
  }
  function nasSyncReplaceRemote(event){
    const kind=event.kind,field=nasSyncRemoteCollection(kind);
    if(!field)return false;
    const obj=kind==="profile_settings"?event.payload?.profile:event.payload;
    if(!event.deleted&&(!obj||typeof obj!=="object"||!obj.id))return false;
    if(!Array.isArray(state[field]))state[field]=[];
    const idx=state[field].findIndex(x=>String(x.id)===event.entity_id);
    if(event.deleted){if(idx>=0)state[field].splice(idx,1);return true;}
    if(idx<0)state[field].push(clone(obj));
    else state[field][idx]=clone(obj);
    if(kind==="profile_settings"&& !state.activeProfileId)state.activeProfileId=obj.id;
    return true;
  }
  async function nasSyncStage(conn,meta){
    if(nasApplyingRemote)return meta;
    const items=nasOwnProfileItems(nasSyncEligibleProfileIds(conn,meta));
    const pending=new Map(meta.outbox.map(x=>[nasEntityKey(x.entityType,x.entityId),x]));
    for(const item of items){
      const key=nasEntityKey(item.kind,item.entityId),value=nasLocalFingerprint(item.payload);
      if(meta.conflicts.some(x=>nasEntityKey(x.kind,x.entityId)===key))continue;
      if(value===meta.hashes[key]&&!pending.has(key))continue;
      if(pending.has(key)&&pending.get(key).fingerprint===value)continue;
      const candidate={
        operationId:crypto.randomUUID(),entityType:item.kind,entityId:item.entityId,
        expectedRevision:meta.revisions[key]||0,payload:item.payload,
        deleted:false,fingerprint:value
      };
      if(JSON.stringify(candidate.payload).length>12000){
        meta.error="Certaines données dépassent la taille de synchronisation par entité.";
        continue;
      }
      pending.set(key,candidate);
    }
    meta.outbox=[...pending.values()];
    await put("nasSyncMeta",meta);
    return meta;
  }
  async function nasSyncPush(conn,meta){
    if(!meta.outbox.length)return;
    const batch=meta.outbox.slice(0,30);
    const result=await nasRequest(conn.url,"/api/v1/sync/push",{
      method:"POST",token:conn.token,payload:{operations:batch.map(
        ({fingerprint,...op})=>op)}
    });
    for(const row of result.results||[]){
      const original=batch.find(x=>x.operationId===row.operationId);
      if(!original)continue;
      const k=nasEntityKey(original.entityType,original.entityId);
      if(row.status==="applied"||row.status==="duplicate"){
        if(original.entityType==="profile_settings" &&
           !meta.remoteProfileIds.includes(original.entityId))
          meta.remoteProfileIds.push(original.entityId);
        meta.revisions[k]=row.revision;
        meta.hashes[k]=original.fingerprint;
        meta.outbox=meta.outbox.filter(x=>x.operationId!==row.operationId);
      }else if(row.status==="conflict"){
        const conflict={kind:original.entityType,entityId:original.entityId,
          localValue:original.payload,expected:original.expectedRevision,
          actual:row.currentRevision,at:new Date().toISOString()};
        if(!meta.conflicts.some(x=>x.kind===conflict.kind&&x.entityId===conflict.entityId))
          meta.conflicts.push(conflict);
        meta.outbox=meta.outbox.filter(x=>x.operationId!==row.operationId);
      }else{
        meta.error="Refus de synchronisation pour "+original.entityType+" : "+row.status;
        meta.outbox=meta.outbox.filter(x=>x.operationId!==row.operationId);
      }
    }
    await put("nasSyncMeta",meta);
  }
  async function nasSyncPull(conn,meta){
    let dirty=false;
    for(let page=0;page<50;page++){
      const batch=await nasRequest(conn.url,"/api/v1/sync/pull?cursor="+meta.cursor+"&limit=100",
        {token:conn.token});
      for(const evt of batch.events||[]){
        if(evt.kind==="profile_settings"&&evt.payload?.profile?.id){
          meta.remotePrimaryProfileId=meta.remotePrimaryProfileId||evt.payload.profile.id;
          if(evt.deleted)meta.remoteProfileIds=meta.remoteProfileIds.filter(id=>id!==evt.entity_id);
          else if(!meta.remoteProfileIds.includes(evt.entity_id))meta.remoteProfileIds.push(evt.entity_id);
        }
        const key=nasEntityKey(evt.kind,evt.entity_id);
        // Ignore own events already acknowledged; do not overwrite local edits.
        const pending=meta.outbox.some(x=>nasEntityKey(x.entityType,x.entityId)===key);
        const field=nasSyncRemoteCollection(evt.kind);
        const remoteObj=evt.kind==="profile_settings"?evt.payload?.profile:evt.payload;
        const current=field&&Array.isArray(state[field])?
          state[field].find(x=>String(x.id)===evt.entity_id):null;
        const remoteFingerprint=nasLocalFingerprint(evt.payload);
        const currentFingerprint=current?nasLocalFingerprint(
          evt.kind==="profile_settings"?{profile:current}:current):null;
        const base=meta.hashes[key];
        const diverged=current&&currentFingerprint!==base&&currentFingerprint!==remoteFingerprint;
        if(pending||diverged){
          const conflict=meta.conflicts.find(x=>x.kind===evt.kind&&x.entityId===evt.entity_id);
          if(conflict)conflict.remoteValue=clone(evt.payload);
          else meta.conflicts.push({kind:evt.kind,entityId:evt.entity_id,
              localValue:clone(current),remoteValue:clone(evt.payload),
              at:new Date().toISOString()});
        }else{
          nasApplyingRemote=true;
          try{dirty=nasSyncReplaceRemote(evt)||dirty;}finally{nasApplyingRemote=false;}
          meta.hashes[key]=remoteFingerprint;
        }
        meta.revisions[key]=Math.max(meta.revisions[key]||0,evt.revision);
        meta.cursor=Math.max(meta.cursor,evt.sequence);
      }
      await put("nasSyncMeta",meta);
      if(!batch.hasMore)break;
    }
    if(dirty){await put("app",state);render();}
  }
  async function nasSyncNow(){
    if(nasSyncBusy||document.visibilityState==="hidden")return;
    const conn=await nasStoredConnection();
    if(!conn?.token||!conn.url)return;
    nasSyncBusy=true;
    try{
      const meta=await nasSyncLoadMeta(conn);
      // Pull first when joining an established profile on a new terminal,
      // avoiding a local snapshot overwriting existing NAS history.
      if(!meta.initialized){
        await nasSyncPull(conn,meta);
        if(meta.remotePrimaryProfileId && !conn.localProfileId){
          // Existing NAS: bind this terminal to the remote profile, not an
          // unrelated local default profile. Keep other local profiles intact.
          conn.localProfileId=meta.remotePrimaryProfileId;
          state.activeProfileId=meta.remotePrimaryProfileId;
          await put("nasConnection",conn);
          await put("app",state);
          render();
        }
        meta.initialized=true;
        await put("nasSyncMeta",meta);
      }
      await nasSyncStage(conn,meta);
      await nasSyncPush(conn,meta);
      await nasSyncPull(conn,meta);
      meta.syncLastAt=new Date().toISOString();meta.error=null;
      await put("nasSyncMeta",meta);
    }catch(err){
      const meta=await nasSyncLoadMeta(conn);
      meta.error=String(err?.message||err);
      await put("nasSyncMeta",meta);
    }finally{nasSyncBusy=false;}
  }
  function nasSyncSchedule(){
    if(nasApplyingRemote)return;
    if(nasSyncDelay)clearTimeout(nasSyncDelay);
    nasSyncDelay=setTimeout(()=>{nasSyncDelay=null;nasSyncNow().catch(()=>{});},1400);
  }
  function nasSyncStart(){
    if(nasSyncStarted)return;
    nasSyncStarted=true;
    window.addEventListener("online",nasSyncSchedule);
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible")nasSyncSchedule();
    });
    setInterval(()=>{if(document.visibilityState==="visible")nasSyncSchedule();},60000);
    nasSyncSchedule();
  }
  async function nasSyncResolveConflicts(){
    const conn=await nasStoredConnection();
    if(!conn?.token)throw Error("Pas de profil NAS associé.");
    const meta=await nasSyncLoadMeta(conn);
    if(!meta.conflicts.length){alert("Aucun conflit.");return;}
    for(const conflict of [...meta.conflicts]){
      if(!conflict.remoteValue){
        alert("Version NAS non encore récupérée pour "+conflict.entityId+". Synchroniser à nouveau.");
        continue;
      }
      const keepLocal=confirm("Conflit sur "+conflict.kind+"/"+conflict.entityId+
        ". OK = conserver les données de CE téléphone et proposer leur envoi au NAS. "+
        "Annuler = conserver la version actuellement sur le NAS sur ce téléphone.");
      const key=nasEntityKey(conflict.kind,conflict.entityId);
      meta.outbox=meta.outbox.filter(x=>nasEntityKey(x.entityType,x.entityId)!==key);
      if(keepLocal){
        // CAS on latest observed NAS revision. Never bypass explicit conflict.
        const mine=conflict.localValue?.profile?conflict.localValue:
          conflict.kind==="profile_settings"?{profile:conflict.localValue}:
            conflict.localValue;
        if(!mine||!mine.id&&!mine.profile?.id)continue;
        const operation={operationId:crypto.randomUUID(),entityType:conflict.kind,
          entityId:conflict.entityId,expectedRevision:meta.revisions[key]||0,
          payload:mine,deleted:false,fingerprint:nasLocalFingerprint(mine)};
        meta.outbox.push(operation);
      }else{
        nasApplyingRemote=true;
        try{nasSyncReplaceRemote({kind:conflict.kind,entity_id:conflict.entityId,
          payload:conflict.remoteValue,deleted:false});}
        finally{nasApplyingRemote=false;}
        meta.hashes[key]=nasLocalFingerprint(conflict.remoteValue);
        await put("app",state);
        render();
      }
      meta.conflicts=meta.conflicts.filter(x=>x!==conflict);
    }
    await put("nasSyncMeta",meta);
    await nasSyncNow();
    await nasSyncDisplayStatus();
  }
  async function nasSyncDisplayStatus(){
    const conn=await nasStoredConnection();
    const meta=conn?.token?await nasSyncLoadMeta(conn):null;
    const result=el("nasSyncStatus");
    if(result)result.textContent=!conn?.token?"Non associé au NAS.":(
      "Dernière synchronisation : "+(meta?.syncLastAt?
        new Date(meta.syncLastAt).toLocaleString("fr-FR"):"aucune")+
      ". Profils sur NAS détectés : "+(meta?.remoteProfileIds?.length||0)+
      " / "+(state.profiles?.length||0)+" locaux"+
      ". En attente : "+(meta?.outbox.length||0)+
      ". Conflits : "+(meta?.conflicts.length||0)+
      (meta?.error?". Problème : "+meta.error:"")
    );
  }

  // Web Push inbox: iPhone Home Screen app + browser, always local-first.
  // No bearer token or personal health metric is stored in push messages.
  let pushInboxItems=[];
  function pushInboxDb(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window))return reject(Error("IndexedDB indisponible"));
      const request=indexedDB.open("ResurGoPushInboxV1",1);
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains("inbox"))
          request.result.createObjectStore("inbox",{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  function pushInboxRefreshBadge(){
    const button=el("pushInboxButton");
    if(!button)return;
    const unread=pushInboxItems.filter(item=>!item.read).length;
    button.setAttribute("aria-label",unread?`${unread} notification${unread>1?"s":""} non lue${unread>1?"s":""}`:"Consulter les notifications");
    const badge=button.querySelector(".notificationCount");
    if(badge){badge.hidden=!unread;badge.textContent=unread>99?"99+":String(unread);}
  }
  async function pushInboxLoad(){
    let db;
    try{
      db=await pushInboxDb();
      const items=await new Promise((resolve,reject)=>{
        const tx=db.transaction("inbox","readonly");
        const req=tx.objectStore("inbox").getAll();
        req.onsuccess=()=>resolve(req.result||[]);
        req.onerror=()=>reject(req.error);
      });
      pushInboxItems=items.sort((a,b)=>String(b.receivedAt||"").localeCompare(String(a.receivedAt||""))).slice(0,200);
    }catch(e){console.warn("Historique push indisponible",e);}
    finally{db?.close();}
    pushInboxRefreshBadge();
    if(state.ui.view==="pushInbox")render();
  }
  async function pushInboxMarkRead(id){
    const item=pushInboxItems.find(x=>x.id===id);
    if(!item||item.read)return;
    item.read=true;
    let db;
    try{
      db=await pushInboxDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction("inbox","readwrite");
        tx.objectStore("inbox").put(item);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
    }finally{db?.close();}
    pushInboxRefreshBadge();
  }
  async function pushInboxOpen(id=""){
    state.ui.view="pushInbox";
    if(id&&/^[a-zA-Z0-9_-]{1,128}$/.test(id))state.ui.selectedPushId=id;
    await pushInboxLoad();
    if(state.ui.selectedPushId)await pushInboxMarkRead(state.ui.selectedPushId);
    const url=new URL(window.location.href);
    if(url.searchParams.has("notification")){
      url.searchParams.delete("notification");
      history.replaceState(null,"",url.href);
    }
    await put("app",state);
    render();
  }
  function pushInboxView(){
    const id=state.ui.selectedPushId;
    const selected=pushInboxItems.find(x=>x.id===id);
    const unread=pushInboxItems.filter(x=>!x.read).length;
    const list=pushInboxItems.map(x=>
      `<button class="secondary" data-open-push="${esc(x.id)}" style="text-align:left;display:block;width:100%;margin:6px 0">
        ${x.read?"":"● "}<strong>${esc(x.title)}</strong>
        <span class="muted">${esc(new Date(x.receivedAt).toLocaleString("fr-FR"))}</span>
        <span style="display:block">${esc(x.body)}</span>
      </button>`).join("");
    const planned=selected?.sessionId?state.plans.find(x=>x.id===selected.sessionId):null;
    return `<section class="grid"><h1>Notifications</h1>
      <p class="muted">${pushInboxItems.length} notifications enregistrées · ${unread} non lues.
        Les alertes reçues hors ligne restent consultables ici.</p>
      ${selected?`<article class="panel"><h2>${esc(selected.title)}</h2>
        <p>${esc(selected.body)}</p>
        <p class="muted">Reçue le ${esc(new Date(selected.receivedAt).toLocaleString("fr-FR"))}</p>
        ${planned?`<button class="primary" data-push-session="${esc(planned.id)}">Voir la séance dans le plan</button>`:""}
      </article>`:""}
      <article class="panel"><h2>Historique</h2>
        ${list||"<p>Aucune notification reçue.</p>"}</article></section>`;
  }

  function pushPublicKeyBytes(key){
    const raw=String(key||"").replace(/-/g,"+").replace(/_/g,"/");
    const bytes=atob(raw.padEnd(Math.ceil(raw.length/4)*4,"="));
    return Uint8Array.from(bytes,c=>c.charCodeAt(0));
  }
  async function pushEnableFromSettings(){
    try{
      if(!("serviceWorker" in navigator)||!("PushManager" in window)||
         !("Notification" in window))throw Error("Web Push non disponible dans ce navigateur.");
      if(/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!isStandalone())
        throw Error("Sur iPhone, installe d'abord ResurGo sur l'écran d'accueil.");
      // Safari iOS needs the permission request BEFORE any unrelated await,
      // otherwise user activation may be lost and the prompt is blocked.
      const permission=Notification.permission==="granted"?"granted":
        await Notification.requestPermission();
      if(permission!=="granted")throw Error("Permission de notification refusée.");
      const conn=await nasStoredConnection();
      if(!conn?.token)throw Error("Associe d'abord cet appareil au compte NAS.");
      const reg=await navigator.serviceWorker.ready;
      const key=await nasRequest(conn.url,"/api/v1/push/key",{token:conn.token});
      if(!key.publicKey)throw Error("Clé Web Push du NAS indisponible.");
      const existing=await reg.pushManager.getSubscription();
      const subscription=existing||await reg.pushManager.subscribe({
        userVisibleOnly:true,applicationServerKey:pushPublicKeyBytes(key.publicKey)
      });
      const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Paris";
      await nasRequest(conn.url,"/api/v1/push/subscribe",{
        method:"POST",token:conn.token,
        payload:{subscription:subscription.toJSON(),timezone,
          reminderTime:state.settings.notifications.reminderTime||"08:00"}
      });
      alert("Web Push enregistré sur ce téléphone. Les rappels arriveront quand le worker NAS sera activé.");
      await pushStatusInSettings();
    }catch(err){alert("Activation Web Push : "+(err?.message||"échec"));}
  }
  async function pushDisableFromSettings(){
    try{
      const conn=await nasStoredConnection();
      if(!conn?.token)throw Error("Aucun compte NAS associé.");
      await nasRequest(conn.url,"/api/v1/push/unsubscribe",{method:"POST",token:conn.token});
      const reg=await navigator.serviceWorker?.ready;
      const subscription=await reg?.pushManager?.getSubscription();
      if(subscription)await subscription.unsubscribe();
      await pushStatusInSettings();
      alert("Abonnement Web Push de cet appareil désactivé.");
    }catch(err){alert("Désabonnement : "+(err?.message||"échec"));}
  }
  async function pushTestFromSettings(){
    try{
      const conn=await nasStoredConnection();
      if(!conn?.token)throw Error("Appareil NAS non associé.");
      const result=await nasRequest(conn.url,"/api/v1/push/test",
        {method:"POST",token:conn.token});
      if(!result.sent)throw Error("Le NAS n'a pas confirmé l'envoi.");
      alert("Envoi accepté par le service de Push. Vérifie la notification sur ce téléphone.");
    }catch(err){alert("Test Web Push : "+(err?.message||"échec"));}
  }
  async function pushStatusInSettings(){
    const target=el("nasPushStatus");
    if(!target)return;
    try{
      const conn=await nasStoredConnection();
      if(!conn?.token){target.textContent="Associer d'abord ce téléphone au NAS.";return;}
      const status=await nasRequest(conn.url,"/api/v1/push/status",{token:conn.token});
      target.textContent=status.subscribed?
        "Abonnement actif sur NAS · rappel "+status.reminderTime+" ("+status.timezone+")":
        "Pas d'abonnement Web Push pour cet appareil.";
    }catch(err){target.textContent="Statut Push indisponible : "+(err?.message||"réseau");}
  }

  async function pushUpdateReminderSetting(){
    const conn=await nasStoredConnection();
    if(!conn?.token||!("serviceWorker" in navigator))return;
    const reg=await navigator.serviceWorker.ready;
    const subscription=await reg.pushManager?.getSubscription();
    if(!subscription)return; // No opt-in: never subscribe automatically.
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"Europe/Paris";
    await nasRequest(conn.url,"/api/v1/push/subscribe",{
      method:"POST",token:conn.token,
      payload:{subscription:subscription.toJSON(),timezone,
        reminderTime:state.settings.notifications.reminderTime||"08:00"}
    });
  }

  // ResurGo — voix neurales Edge françaises (Vivienne / Remy), mêmes identités que Histoire.
  // AUCUN réseau ni LLM nécessaire en course si le pack choisi est en cache.
  let coachVoiceManifest=null,coachVoiceLoading=null,coachVoiceAudio=null;
  const voicePackBase="./voice/fr-FR/v2/";
  async function voiceGetManifest(){
    if(coachVoiceManifest)return coachVoiceManifest;
    if(coachVoiceLoading)return coachVoiceLoading;
    coachVoiceLoading=fetch(voicePackBase+"manifest.json",{cache:"force-cache"})
      .then(r=>{if(!r.ok)throw Error("Pack vocal non publié.");return r.json();})
      .then(data=>{
        if(data?.format!=="resurgo-pregenerated-voice-pack"||!data.files)
          throw Error("Manifeste vocal non reconnu.");
        coachVoiceManifest=data;return data;
      }).finally(()=>{coachVoiceLoading=null;});
    return coachVoiceLoading;
  }
  async function voiceSpeakId(id,voiceKind=null){
    const kind=voiceKind||state.settings?.tts?.pregeneratedVoice||"feminine";
    const manifest=await voiceGetManifest();
    const file=manifest.files[kind+"/"+id];
    if(!file?.src)return false;
    const fileUrl=voicePackBase+file.src;
    if(coachVoiceAudio)coachVoiceAudio.pause();
    coachVoiceAudio=new Audio(fileUrl);
    coachVoiceAudio.preload="auto";
    coachVoiceAudio.volume=Math.max(0,Math.min(1,Number(state.settings?.tts?.volume??1)));
    await coachVoiceAudio.play();
    return true;
  }
  async function voicePreview(kind){
    try{
      const select=kind==="masculine"?"masculine":"feminine";
      await voiceSpeakId("phrase_001",select);
      state.settings.tts.pregeneratedVoice=select;
      await save("Voix "+(select==="masculine"?"masculine":"féminine")+
        " sélectionnée. Pour la course hors réseau, télécharger son pack.");
      render();
    }catch(err){
      alert("Préécoute indisponible : "+(err?.message||"audio absent")+
        ". Aucun fichier n'est simulé.");
    }
  }
  async function voiceInstallOffline(){
    try{
      const kind=state.settings?.tts?.pregeneratedVoice||"feminine";
      const manifest=await voiceGetManifest();
      if(!("caches" in window))throw Error("Cache audio indisponible dans ce navigateur.");
      const list=Object.values(manifest.files).filter(x=>x.speakerIdentity===manifest.voices?.[kind]?.voiceId);
      if(!list.length)throw Error("Aucun fichier audio disponible pour cette voix.");
      const cache=await caches.open("resurgo-voice-"+manifest.packId+"-"+kind);
      let done=0;
      const label=el("voiceOfflineStatus");
      for(const item of list){
        const url=voicePackBase+item.src;
        if(!await cache.match(url)){
          const response=await fetch(url);
          if(!response.ok)throw Error("Téléchargement incomplet : "+item.src);
          await cache.put(url,response.clone());
        }
        done++;
        if(label)label.textContent="Audio hors ligne : "+done+" / "+list.length;
      }
      await cache.put(voicePackBase+"manifest.json",new Response(JSON.stringify(manifest),
        {headers:{"Content-Type":"application/json"}}));
      if(label)label.textContent="Voix "+kind+" : "+done+" clips disponibles hors ligne.";
      state.settings.tts.voicePackCached=manifest.packId+"/"+kind;
      await save();
    }catch(err){
      alert("Préchargement du pack audio impossible : "+(err?.message||"erreur réseau"));
    }
  }

  // ResurGo — données multisources. Pure selection, never fill missing data.
  const SENSOR_PRIORITIES={
    heartRate:["chest_strap","watch","fitness_machine","phone"],
    speed:["watch_gps","phone_gps","fitness_machine","bike_wheel"],
    distance:["watch_gps","phone_gps","fitness_machine","bike_wheel"],
    altitude:["watch_barometer","phone_barometer","watch_gps","phone_gps"],
    cadence:["dedicated_cadence","watch","fitness_machine","phone"],
    power:["power_meter","fitness_machine","estimated"]
  };
  function chooseSensorMetric(metric, samples, now=Date.now()){
    const order=SENSOR_PRIORITIES[metric]||[];
    const usable=(samples||[]).filter(s=>s&&s.metric===metric&&
      typeof s.value==="number"&&Number.isFinite(s.value)&&
      typeof s.timestamp==="number"&&now-s.timestamp>=0&&
      now-s.timestamp<=(s.maxAgeMs||7000)&&s.accuracy!==false);
    if(!usable.length)return {available:false,metric,source:null,value:null,reason:"aucune source fraîche"};
    usable.sort((a,b)=>{
      const ar=order.indexOf(a.sourceType),br=order.indexOf(b.sourceType);
      const ap=ar<0?999:ar,bp=br<0?999:br;
      if(ap!==bp)return ap-bp;
      if(a.quality!==b.quality)return (b.quality||0)-(a.quality||0);
      return b.timestamp-a.timestamp;
    });
    const best=usable[0];
    return {available:true,metric,value:best.value,source:best.sourceType,
      deviceId:best.deviceId||null,confidence:best.quality??null,
      ageMs:now-best.timestamp};
  }
  function sensorAccept(state, sample){
    if(!sample?.metric||!Number.isFinite(sample?.value))return state;
    const list=state[sample.metric]||[];
    const deduplicated=list.filter(x=>x.deviceId!==sample.deviceId||
      x.sourceType!==sample.sourceType);
    deduplicated.push({...sample});
    state[sample.metric]=deduplicated;
    return state;
  }

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
      <div class="actions"><button class="secondary" id="openBluefyHelp">ⓘ Comment connecter un capteur dans Bluefy</button></div>
      <div class="actions"><button class="primary" id="liveRun">Course extérieure</button>
      <button class="secondary" id="liveBike">Vélo extérieur</button></div>
      <p><strong>Intérieur FTMS (Bluefy)</strong> : connecter d’abord la machine dans Réglages → Capteurs Bluetooth ⓘ, puis démarrer si ResurGo reçoit réellement vitesse ou distance.</p>
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
      <div><p class="muted">Dénivelé filtré</p><h2 id="liveGain">${Math.round(s.gainM)} m</h2></div>
      </div>
      <p id="liveTerrain">Terrain : ${esc(s.terrain)}</p>
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
    bleStatusRefresh();
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
      s.speedMps=0;liveUpdate();return;
    }
    if(!bleMachineReading||s.lastMachineTimestamp===bleMachineReading.timestamp){
      s.signal="machine FTMS connectée";return;
    }
    const at=bleMachineReading.timestamp;
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
    s.signal="données FTMS reçues"+(s.estimatedDistance?" (distance estimée)":"");
    if(++s.sampleCount%5===0)put("app",state).catch(()=>{});
    liveUpdate();
  }
  async function liveStartIndoor(){
    if(!profile())return alert("Créer un profil avant la séance.");
    if(state.liveSession)return alert("Une séance est déjà active.");
    const m=bleMachineSnapshot();
    if(!m.available)return alert("Impossible de démarrer : connecter une machine FTMS qui transmet une vitesse ou une distance fraîche. Le cardio seul ne suffit pas.");
    state.liveSession={id:uid("activity"),profileId:profile().id,sport:m.kind==="bike"?"bike":"run",
      machineKind:m.kind,startedAt:new Date().toISOString(),pausedAt:null,pausedMs:0,
      distanceM:0,gainM:0,speedMps:0,rawDistanceM:Number.isFinite(m.distanceM)?m.distanceM:null,
      lastMachineTimestamp:bleMachineReading?.timestamp||null,estimatedDistance:false,
      terrain:"Intérieur",signal:"machine FTMS connectée",sampleCount:0,
      lastSpeech:Date.now()};
    state.ui.view="coachLive";await save();render();
    if(!liveInterval)liveInterval=setInterval(()=>{liveIndoorTick();liveUpdate();},1000);
    liveSpeech("start");
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
      await save();render();if(!liveInterval)liveInterval=setInterval(()=>{liveIndoorTick();liveUpdate();},1000);
    }else{await save();render();liveTrackStart();}
  }
  async function liveFinish(){
    const s=state.liveSession;if(!s)return;
    if(!confirm("Terminer et conserver cette séance dans l'historique ?"))return;
    const durationSeconds=liveSeconds(s),distanceKm=Math.round(s.distanceM)/1000;
    liveTrackStop();
    state.activities.push({id:s.id,profileId:s.profileId,type:s.sport,
      source:s.machineKind?"resurgo_ftms_ble":"resurgo_gps_phone",machineKind:s.machineKind||null,startedAt:s.startedAt,
      completedAt:new Date().toISOString(),durationSeconds,distanceKm,
      elevationGainM:Math.round(s.gainM),
      status:distanceKm>.05&&durationSeconds>30?"completed":"stopped_early",
      notes:s.machineKind?"Progression mesurée via FTMS BLE (distance estimée si vitesse seule). Relecture automatique hors ligne non garantie.":"GPS téléphone ; cardio optionnel BLE selon navigateur ; PWA non garantie en arrière-plan"});
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

  function render(){ applyTheme(); document.body.classList.toggle("modalOpen",!!state.ui.modal); const views={today,plan:planView,session:sessionView,exercises:exercisesView,stats,settings,coachLive:liveCoachView,pushInbox:pushInboxView}; $("#app").innerHTML=shell((views[state.ui.view]||today)()); bind(); }
  function on(id,fn){ const x=el(id); if(x) x.onclick=fn; }
  function setSegmentedActive(btn){
    btn.parentElement?.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===btn));
  }
  function setChartViewport(key,total,next){
    state.ui.chartViewport=state.ui.chartViewport||{};
    const current=chartViewport(key,total), size=Math.max(2,Math.min(total,Math.round(next.size??current.size))), maxOffset=Math.max(0,total-size), offset=Math.max(0,Math.min(maxOffset,Math.round(next.offset??current.offset)));
    state.ui.chartViewport[key]={window:size,offset};
    render();
  }
  function setChartHover(svg, clientX){
    const rect=svg.getBoundingClientRect(), view=svg.viewBox.baseVal, visible=[...svg.querySelectorAll(".chartPoint")], count=visible.reduce((m,p)=>Math.max(m,Number(p.dataset.pointIndex)||0),0)+1;
    if(!rect.width||!count) return;
    const localX=(clientX-rect.left)/rect.width*view.width, idx=Math.max(0,Math.min(count-1,Math.round((localX-30)/Math.max(1,(view.width-60)/Math.max(1,count-1)))));
    visible.forEach(p=>p.classList.toggle("active",Number(p.dataset.pointIndex)===idx));
    const active=svg.querySelector(`.chartPoint[data-point-index="${idx}"] title`), readout=svg.querySelector(".chartReadout");
    if(readout&&active) readout.textContent=active.textContent||"";
  }
  function bindInteractiveCharts(){
    $$('svg[data-interactive-chart="1"]').forEach(svg=>{
      const key=svg.dataset.chartKey, total=Number(svg.dataset.chartTotal)||0; if(!key||total<2) return;
      let startX=null, startOffset=0, pinchStart=null, pinchSize=0;
      svg.onpointermove=e=>setChartHover(svg,e.clientX);
      svg.onpointerdown=e=>{ startX=e.clientX; startOffset=chartViewport(key,total).offset; svg.setPointerCapture?.(e.pointerId); };
      svg.onpointerup=e=>{ if(startX==null) return; const dx=e.clientX-startX, current=chartViewport(key,total), step=Math.round(-dx/Math.max(1,svg.getBoundingClientRect().width)*current.size); startX=null; if(step) setChartViewport(key,total,{size:current.size,offset:startOffset+step}); };
      svg.onwheel=e=>{ e.preventDefault(); const current=chartViewport(key,total), direction=e.deltaY>0?1:-1, nextSize=current.size+direction*Math.max(1,Math.round(current.size*.18)), center=current.offset+current.size/2; setChartViewport(key,total,{size:nextSize,offset:center-nextSize/2}); };
      svg.ontouchstart=e=>{ if(e.touches.length===2){ const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY; pinchStart=Math.hypot(dx,dy); pinchSize=chartViewport(key,total).size; } };
      svg.ontouchmove=e=>{ if(e.touches.length===1) setChartHover(svg,e.touches[0].clientX); if(e.touches.length===2&&pinchStart){ e.preventDefault(); const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY, ratio=Math.max(.35,Math.min(3,Math.hypot(dx,dy)/pinchStart)), current=chartViewport(key,total), nextSize=Math.round(pinchSize/ratio), center=current.offset+current.size/2; setChartViewport(key,total,{size:nextSize,offset:center-nextSize/2}); } };
    });
  }
  function bind(){
    on("pushInboxButton",()=>pushInboxOpen());
    on("enableNasPush",pushEnableFromSettings);
    on("disableNasPush",pushDisableFromSettings);
    on("testNasPush",pushTestFromSettings);
    on("checkNasPush",pushStatusInSettings);
    $$("[data-open-push]").forEach(b=>b.onclick=()=>pushInboxOpen(b.dataset.openPush));
    $$("[data-push-session]").forEach(b=>b.onclick=()=>{
      const session=state.plans.find(x=>x.id===b.dataset.pushSession);
      if(!session)return;
      if(state.profiles.some(x=>x.id===session.profileId))state.activeProfileId=session.profileId;
      state.ui.view="plan";
      save().then(render);
    });
    on("openLiveCoach",()=>{state.ui.view="coachLive";save().then(render);});
    on("liveRun",()=>liveStart("run")); on("liveBike",()=>liveStart("bike"));
    on("liveBack",()=>{state.ui.view="today";save().then(render);});
    on("livePause",livePause); on("liveResume",liveResume); on("liveFinish",liveFinish);
    on("liveEncourage",()=>liveSpeech("positive"));
    on("bleHrConnect",bleHrConnect); on("bleHrDisconnect",bleHrDisconnect);
    on("bleMachineConnect",bleMachineConnect); on("bleMachineDisconnect",bleMachineDisconnect);
    on("copyBluefyUrl",bluefyCopyAddress);
    on("liveStartIndoor",liveStartIndoor);
    on("openBluefyHelp",()=>{state.ui.view="settings";save().then(()=>{render();
      const info=el("bluefyHelp");const fold=info?.closest(".settingsFold");
      if(fold)fold.open=true;if(info){info.open=true;info.scrollIntoView?.({behavior:"smooth",block:"start"});}
    });});
    $$("[data-view]").forEach(b=>b.onclick=()=>{state.ui.view=b.dataset.view; save().then(render);}); $$("[data-start]").forEach(b=>b.onclick=()=>start(b.dataset.start)); $$("[data-profile]").forEach(b=>b.onclick=()=>{state.activeProfileId=b.dataset.profile; save("Profil actif changé.").then(render);});
    on("createProfile",createProfile); on("startToday",()=>{const p=profile(), s=p?coachPickToday(p).session:null; if(s) start(s.id);}); on("goPlan",()=>{state.ui.view="plan"; save().then(render);}); on("nextWeek",()=>{const p=profile(); if(p){makeWeek(p.id,false,true); save("Semaine suivante générée.").then(render);}}); on("regenPlan",()=>{const p=profile(); if(p){makeWeek(p.id); save("Plan recalculé.").then(render);}}); on("activeRest",()=>{const p=profile(); if(p){state.activities.push({id:uid("activity"),profileId:p.id,source:"manual",type:"walk",startedAt:new Date().toISOString(),durationSeconds:1200}); refreshPlanAfterActivity(p.id); save("Repos actif enregistré et plan recalculé.").then(render);}});
    on("installPwa",installPwa); on("dismissPwa",()=>{state.settings.hideInstallPrompt=true; save().then(render);});
    $$("[data-rate-target]").forEach(b=>b.onclick=()=>{const input=el(b.dataset.rateTarget), val=Number(b.dataset.rateValue), m=mood[val]; if(!input||!m) return; input.value=val; const field=b.closest(".smileyField"), summary=field?.querySelector("summary"), details=field?.querySelector("details"); field?.classList.remove("empty","bad","warn","ok","good","great"); field?.classList.add(m.tone); field?.querySelectorAll("[data-rate-target]").forEach(x=>x.classList.toggle("selected",x===b)); if(summary) summary.innerHTML=`<b>${m.face}</b><small>${val}/5</small>`; if(details) details.open=false; if(["quickBack","quickKnee","quickFatigue"].includes(b.dataset.rateTarget)) saveQuickCheck(true); if(["profileBack","profileKnee","profileFatigue"].includes(b.dataset.rateTarget)) saveProfileFields(); updateAppBadge();});
    $$("[data-week-window-target]").forEach(b=>b.onclick=()=>{const input=el(b.dataset.weekWindowTarget); if(!input) return; input.value=Number(b.dataset.weekWindowValue)===7?"7":"5"; setSegmentedActive(b); if(input.id==="availabilityDays") saveProfileFields({regen:true,msg:`Plan recalculé sur ${input.value} jours.`});});
    $$("[data-media-target]").forEach(b=>b.onclick=()=>{const input=el(b.dataset.mediaTarget); if(!input) return; input.value=b.dataset.mediaValue==="female"?"female":"male"; setSegmentedActive(b); if(input.id==="mediaGender") saveProfileFields({regen:false,msg:"Médias mis à jour."});});
    on("saveQuick",()=>saveQuickCheck(false)); on("regen",()=>{const p=profile(); if(p){makeWeek(p.id); save("Plan régénéré.").then(render);}});
    on("startTimer",startTimer); on("continueAfterRest",continueAfterRest); on("skipRest",continueAfterRest); on("okSet",()=>log("yes",0,"ok")); on("partialSet",()=>log("partial",1,"hard")); on("painSet",()=>log("stop",3,"too_hard")); on("speakCue",()=>speakExerciseGuide(currentEx(),"Rappel.")); on("abortSession",()=>{const r=run(); if(r){r.abortedAt=new Date().toISOString(); state.ui.view="today"; stopTimer(); save("Séance arrêtée.").then(render);}});
    on("openMetricModal",()=>{state.ui.modal="metric"; render();}); on("openActivityModal",()=>{state.ui.modal="activity"; render();}); on("openNewProfile",()=>{state.ui.modal="newProfile"; render();}); on("openReadinessInfo",()=>{state.ui.modal="readiness"; render();}); on("openWeightChart",()=>{state.ui.modal="weightChart"; render();}); on("closeModal",()=>{ if(state.ui.modal==="sessionFeedback") state.ui.sessionFeedback=null; state.ui.modal=null; state.ui.recordEdit=null; render();});
    $$("[data-open-chart]").forEach(b=>b.onclick=()=>{ const key=b.dataset.openChart; state.ui.modal=`chart_${key}`; state.ui.recordEdit=null; state.ui.chartViewport=state.ui.chartViewport||{}; state.ui.chartHistoryOpen={...(state.ui.chartHistoryOpen||{}),[key]:false}; render(); });
    bindInteractiveCharts();
    $$(".chartHistoryFold").forEach(d=>d.ontoggle=()=>{ const key=String(state.ui.modal||"").replace("chart_",""); if(!key) return; state.ui.chartHistoryOpen=state.ui.chartHistoryOpen||{}; state.ui.chartHistoryOpen[key]=d.open; });
    $$("[data-edit-metric]").forEach(b=>b.onclick=()=>beginRecordEdit("metric",b.dataset.editMetric));
    $$("[data-save-metric]").forEach(b=>b.onclick=()=>saveMetricRecord(b.dataset.saveMetric));
    $$("[data-delete-metric]").forEach(b=>b.onclick=()=>deleteMetricRecord(b.dataset.deleteMetric));
    $$("[data-edit-activity]").forEach(b=>b.onclick=()=>beginRecordEdit("activity",b.dataset.editActivity));
    $$("[data-save-activity]").forEach(b=>b.onclick=()=>saveActivityRecord(b.dataset.saveActivity));
    $$("[data-delete-activity]").forEach(b=>b.onclick=()=>deleteActivityRecord(b.dataset.deleteActivity));
    $$("[data-edit-session-activity]").forEach(b=>b.onclick=()=>beginRecordEdit("sessionActivity",b.dataset.editSessionActivity));
    $$("[data-save-session-activity]").forEach(b=>b.onclick=()=>saveSessionActivityRecord(b.dataset.saveSessionActivity));
    $$("[data-cancel-record-edit]").forEach(b=>b.onclick=()=>cancelRecordEdit());
    on("saveSessionFeedback",saveSessionFeedback);
    on("addMetric",addMetric); on("addRun",addRun); on("saveProfile",()=>saveProfileFields({regen:true,msg:"Profil et plan mis à jour."})); on("regenProfilePlan",()=>saveProfileFields({regen:true,msg:"Plan régénéré."}));
    $$("[data-save-exercise]").forEach(b=>b.onclick=()=>saveExerciseSettings(b.dataset.saveExercise));
    $$("[data-theme-choice]").forEach(b=>b.onclick=()=>{state.settings.theme=b.dataset.themeChoice; save().then(render);}); ["ttsEnabled","ttsRate","ttsVolume"].forEach(id=>{const x=el(id); if(x) x.onchange=saveTtsSettings;}); on("testVoice",()=>speak("ResurGo Fitness est prêt pour la séance.")); on("previewFemale",()=>voicePreview("feminine")); on("previewMale",()=>voicePreview("masculine")); on("cacheVoice",voiceInstallOffline); ["notifEnabled","notifTime"].forEach(id=>{const x=el(id); if(x) x.onchange=saveNotificationSettings;}); on("testNotification",async()=>{ if(notificationPermission()!=="granted"){ const ok=await requestSessionNotifications({test:true}); if(!ok) return; } else save((await showTodayNotification({force:true}))?"Notification envoyée.":"Aucune séance à notifier aujourd'hui.").then(render); }); ["workerUrl","workerToken"].forEach(id=>{const x=el(id); if(x) x.onchange=saveWorkerSettings;}); on("testWorker",testWorker); on("mockGarmin",mockGarmin);
    { const x=el("newGender"), media=el("newMediaGender"); if(x&&media) x.onchange=()=>{ media.value=x.value==="female"?"female":"male"; }; }
    ["profileName","gender","mediaGender","availabilityDays","age","heightCm","startWeightKg","targetWeightKg","targetMonths","sportsHistory","goalFocus"].forEach(id=>{const x=el(id); if(x) x.onchange=()=>saveProfileFields();});
    Object.keys(levels).forEach(k=>{const x=el(`level_${k}`); if(x) x.onchange=()=>saveProfileFields();}); ["irradiating","neurological"].forEach(id=>{const x=el(id); if(x) x.onchange=()=>{const stateText=x.nextElementSibling?.querySelector(".switchState"); if(stateText) stateText.textContent=x.checked?"Oui":"Non"; saveProfileFields();};});
    $$(".smileyField details").forEach(details=>{ const summary=details.querySelector("summary"); if(summary) summary.onclick=e=>{ e.preventDefault(); const willOpen=!details.open; $$(".smileyField details[open]").forEach(x=>{ if(x!==details) x.open=false; }); details.open=willOpen; if(willOpen) requestAnimationFrame(()=>placeSmileyMenu(details)); }; });
    if(!smileyDismissBound){ document.addEventListener("pointerdown",e=>{ if(e.target.closest(".smileyField")) return; $$(".smileyField details[open]").forEach(x=>x.open=false); }); window.addEventListener("resize",()=>$$(".smileyField details[open]").forEach(placeSmileyMenu)); smileyDismissBound=true; }
    on("exportEncryptedJson",exportEncryptedBackup); on("nasCreateProfile",nasCreateProfile); on("nasPairDevice",nasPairWithCode); on("nasGenerateCode",nasGeneratePairCode); on("nasTestConnection",nasTestConnection); on("nasSyncNow",()=>nasSyncNow().then(nasSyncDisplayStatus)); on("nasSyncConflicts",()=>nasSyncResolveConflicts().catch(e=>alert(e.message))); on("nasRetryRecovery",nasRetryRecovery); on("deleteProfile",()=>{const p=profile(); if(p&&confirmTwice("Supprimer ce profil local ?","Confirmation définitive : supprimer ce profil et ses réglages ?")){state.profiles=state.profiles.filter(x=>x.id!==p.id); state.activeProfileId=state.profiles[0]?.id||null; save("Profil supprimé.").then(render);}}); on("resetAll",()=>{if(confirmTwice("Effacer toutes les données locales ResurGo Fitness ?","Confirmation définitive : tout effacer sur cet appareil ?")){state=clone(empty); save("Données locales effacées.").then(render);}});
    const imp=el("restoreEncryptedJson"); if(imp) imp.onchange=e=>e.target.files[0]&&restoreEncryptedBackup(e.target.files[0]); const sf=el("exerciseSearchForm"); if(sf) sf.onsubmit=e=>{e.preventDefault(); state.ui.search=text("searchDraft"); state.ui.searchDraft=state.ui.search; save().then(render);}; const sd=el("searchDraft"); if(sd) sd.oninput=e=>{state.ui.searchDraft=e.target.value; if(!e.target.value){state.ui.search=""; save().then(render);}}; const f=el("familyFilter"); if(f) f.onchange=e=>{state.ui.filter=e.target.value; save().then(render);};
  }
  async function loadBodyMaps(){ await Promise.all(Object.keys(bodyMapAssets).map(async k=>{ try{ bodyMapSvg[k]=await fetch(bodyMapAssets[k],{cache:"force-cache"}).then(r=>r.ok?r.text():""); }catch{} })); }
  async function init(){ registerPwaEvents(); state=(await get("app"))||clone(empty); state={...clone(empty),...state,settings:{...empty.settings,...(state.settings||{}),notifications:{...empty.settings.notifications,...(state.settings?.notifications||{})},tts:{...empty.settings.tts,...(state.settings?.tts||{})}},ui:{...empty.ui,...(state.ui||{})}}; if(location.hash==="#today") state.ui.view="today"; state.ui.message=""; if(state.activeProfileId) ensurePlanCurrent(state.activeProfileId); await loadBodyMaps(); const pushId=new URLSearchParams(location.search).get("notification"); if(pushId&&/^[a-zA-Z0-9_-]{1,128}$/.test(pushId)){state.ui.view="pushInbox";state.ui.selectedPushId=pushId;} render(); if(state.ui.view==="pushInbox")pushInboxOpen(pushId||"").catch(()=>{}); else pushInboxLoad().catch(()=>{}); nasSyncStart(); liveRecoverAfterReload(); registerServiceWorker(); scheduleSessionReminder(); window.addEventListener("online",checkOnlineVersion); document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ if(state.activeProfileId&&ensurePlanCurrent(state.activeProfileId)) save("Plan réajusté selon les jours passés.").then(render); updateAppBadge(); scheduleSessionReminder(); } }); }
  init();
})();
