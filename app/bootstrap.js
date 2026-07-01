// Initialiser le socle applicatif partagé :
// constantes, helpers et début de bibliothèque d'exercices.
(() => {
  const APP_VERSION = "__APP_VERSION__", APP_BUILD = "__APP_BUILD__", DB = "resurgo-fitness-v1", STORE = "state", TODAY = new Date().toISOString().slice(0, 10);
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
