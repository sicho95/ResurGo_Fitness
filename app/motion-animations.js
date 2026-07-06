  // Remplacer les anciens croquis par une animation offline lisible.
  // Le rendu fonctionne comme un GIF SVG : trois poses restent visibles et le focus tourne en boucle.
  function motionKind(x){
    if(["quad_set","straight_leg_raise","seated_knee_extension","standing_hamstring_curl","clamshell","hip_abduction_side"].includes(x.id)) return x.id;
    if(["glute_bridge"].includes(x.id)) return "bridge";
    if(["calf_raise"].includes(x.id)) return "calf";
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
      quad_set:{...common, prop:"serviette", cues:["Jambe tendue","Écrase la serviette","Relâche lentement"], poses:[
        {head:[42,118],neck:[64,123],hip:[132,135],lhand:[78,154],rhand:[104,154],lknee:[178,135],lfoot:[224,136],rknee:[175,136],rfoot:[224,138],extra:"towel"},
        {head:[42,118],neck:[64,123],hip:[132,132],lhand:[78,154],rhand:[104,154],lknee:[178,132],lfoot:[224,134],rknee:[175,132],rfoot:[224,136],extra:"press"},
        {head:[42,118],neck:[64,123],hip:[132,135],lhand:[78,154],rhand:[104,154],lknee:[178,135],lfoot:[224,136],rknee:[175,136],rfoot:[224,138],extra:"towel"}
      ]},
      straight_leg_raise:{...common, prop:"sol", cues:["Cuisse contractée","Lève la jambe tendue","Redescends contrôlé"], poses:[
        {head:[42,118],neck:[64,123],hip:[132,136],lhand:[78,154],rhand:[104,154],lknee:[174,107],lfoot:[205,154],rknee:[178,136],rfoot:[228,138]},
        {head:[42,118],neck:[64,123],hip:[132,136],lhand:[78,154],rhand:[104,154],lknee:[174,107],lfoot:[205,154],rknee:[178,105],rfoot:[226,82]},
        {head:[42,118],neck:[64,123],hip:[132,136],lhand:[78,154],rhand:[104,154],lknee:[174,107],lfoot:[205,154],rknee:[178,124],rfoot:[228,126]}
      ]},
      seated_knee_extension:{...common, prop:"chaise", cues:["Assis droit","Tends doucement","Redescends sans choc"], poses:[
        {head:[86,62],neck:[86,86],hip:[104,128],lhand:[72,120],rhand:[118,120],lknee:[142,158],lfoot:[143,194],rknee:[112,158],rfoot:[112,194],extra:"chair"},
        {head:[86,62],neck:[86,86],hip:[104,128],lhand:[72,120],rhand:[118,120],lknee:[142,158],lfoot:[205,158],rknee:[112,158],rfoot:[112,194],extra:"chair"},
        {head:[86,62],neck:[86,86],hip:[104,128],lhand:[72,120],rhand:[118,120],lknee:[142,158],lfoot:[174,176],rknee:[112,158],rfoot:[112,194],extra:"chair"}
      ]},
      standing_hamstring_curl:{...common, prop:"chaise", cues:["Debout stable","Talon vers fesse","Retour lent"], poses:[
        {head:[106,42],neck:[106,66],hip:[106,118],lhand:[70,102],rhand:[148,102],lknee:[94,156],lfoot:[88,196],rknee:[122,156],rfoot:[130,196],extra:"support"},
        {head:[106,42],neck:[106,66],hip:[106,118],lhand:[70,102],rhand:[148,102],lknee:[94,156],lfoot:[88,196],rknee:[122,156],rfoot:[164,134],extra:"support"},
        {head:[106,42],neck:[106,66],hip:[106,118],lhand:[70,102],rhand:[148,102],lknee:[94,156],lfoot:[88,196],rknee:[122,156],rfoot:[148,164],extra:"support"}
      ]},
      clamshell:{...common, prop:"sol", cues:["Côté stable","Ouvre le genou","Referme contrôlé"], poses:[
        {head:[54,128],neck:[82,130],hip:[146,146],lhand:[72,162],rhand:[105,156],lknee:[178,174],lfoot:[215,185],rknee:[178,174],rfoot:[215,185]},
        {head:[54,128],neck:[82,130],hip:[146,146],lhand:[72,162],rhand:[105,156],lknee:[178,142],lfoot:[215,154],rknee:[178,174],rfoot:[215,185]},
        {head:[54,128],neck:[82,130],hip:[146,146],lhand:[72,162],rhand:[105,156],lknee:[178,160],lfoot:[215,173],rknee:[178,174],rfoot:[215,185]}
      ]},
      hip_abduction_side:{...common, prop:"sol", cues:["Côté stable","Lève la jambe","Redescends lentement"], poses:[
        {head:[54,128],neck:[82,130],hip:[146,146],lhand:[72,162],rhand:[105,156],lknee:[178,174],lfoot:[222,184],rknee:[178,146],rfoot:[224,146]},
        {head:[54,128],neck:[82,130],hip:[146,146],lhand:[72,162],rhand:[105,156],lknee:[178,174],lfoot:[222,184],rknee:[176,116],rfoot:[224,90]},
        {head:[54,128],neck:[82,130],hip:[146,146],lhand:[72,162],rhand:[105,156],lknee:[178,174],lfoot:[222,184],rknee:[178,134],rfoot:[224,122]}
      ]},
      bridge:{...common, prop:"sol", cues:["Pieds au sol","Monte le bassin","Garde le dos long"], poses:[
        {head:[48,132],neck:[74,136],hip:[148,154],lhand:[62,174],rhand:[92,174],lknee:[180,112],lfoot:[224,176],rknee:[194,116],rfoot:[242,176]},
        {head:[48,132],neck:[74,136],hip:[148,116],lhand:[62,174],rhand:[92,174],lknee:[180,112],lfoot:[224,176],rknee:[194,116],rfoot:[242,176]},
        {head:[48,132],neck:[74,136],hip:[148,138],lhand:[62,174],rhand:[92,174],lknee:[180,112],lfoot:[224,176],rknee:[194,116],rfoot:[242,176]}
      ]},
      calf:{...common, prop:"mur", cues:["Debout stable","Monte sur pointes","Descends lentement"], poses:[
        {head:[112,42],neck:[112,66],hip:[112,118],lhand:[74,90],rhand:[150,90],lknee:[100,156],lfoot:[90,196],rknee:[126,156],rfoot:[136,196],extra:"wall"},
        {head:[112,34],neck:[112,58],hip:[112,110],lhand:[74,82],rhand:[150,82],lknee:[100,148],lfoot:[92,188],rknee:[126,148],rfoot:[138,188],extra:"wall"},
        {head:[112,42],neck:[112,66],hip:[112,118],lhand:[74,90],rhand:[150,90],lknee:[100,156],lfoot:[90,196],rknee:[126,156],rfoot:[136,196],extra:"wall"}
      ]},
      push:{...common, prop:"support", cues:["Corps gainé","Descends en bloc","Repousse"], poses:[
        {head:[74,100],neck:[104,112],hip:[180,142],lhand:[116,190],rhand:[145,190],lknee:[198,176],lfoot:[248,190],rknee:[202,176],rfoot:[260,190],extra:"incline"},
        {head:[78,132],neck:[108,142],hip:[184,164],lhand:[116,194],rhand:[145,194],lknee:[198,184],lfoot:[248,194],rknee:[202,184],rfoot:[260,194],extra:"incline"},
        {head:[74,100],neck:[104,112],hip:[180,142],lhand:[116,190],rhand:[145,190],lknee:[198,176],lfoot:[248,190],rknee:[202,176],rfoot:[260,190],extra:"incline"}
      ]},
      pull:{...common, prop:"élastique", cues:["Ancre solide","Tire les coudes","Retour maîtrisé"], poses:[
        {head:[110,42],neck:[110,66],hip:[110,118],lhand:[178,104],rhand:[178,104],lknee:[96,160],lfoot:[78,196],rknee:[126,160],rfoot:[146,196],extra:"band"},
        {head:[110,42],neck:[110,66],hip:[110,118],lhand:[136,104],rhand:[142,104],lknee:[96,160],lfoot:[78,196],rknee:[126,160],rfoot:[146,196],extra:"band"},
        {head:[110,42],neck:[110,66],hip:[110,118],lhand:[158,104],rhand:[164,104],lknee:[96,160],lfoot:[78,196],rknee:[126,160],rfoot:[146,196],extra:"band"}
      ]},
      cardio:{...common, prop:"terrain plat", cues:["Foulée courte","Aisance respiratoire","Reste régulier"], poses:[
        {head:[98,42],neck:[98,66],hip:[90,118],lhand:[64,100],rhand:[126,92],lknee:[78,158],lfoot:[42,194],rknee:[112,154],rfoot:[156,180]},
        {head:[120,42],neck:[120,66],hip:[112,118],lhand:[150,100],rhand:[88,92],lknee:[126,154],lfoot:[168,180],rknee:[98,158],rfoot:[64,194]},
        {head:[142,42],neck:[142,66],hip:[134,118],lhand:[108,100],rhand:[170,92],lknee:[122,158],lfoot:[86,194],rknee:[156,154],rfoot:[200,180]}
      ]},
      dead_bug:{...common, prop:"sol", cues:["Dos plaqué","Bras/jambe opposés","Retour lent"], poses:[
        {head:[48,132],neck:[74,136],hip:[148,146],lhand:[112,78],rhand:[150,78],lknee:[148,95],lfoot:[182,95],rknee:[194,98],rfoot:[226,98]},
        {head:[48,132],neck:[74,136],hip:[148,146],lhand:[58,88],rhand:[150,78],lknee:[148,95],lfoot:[182,95],rknee:[218,142],rfoot:[256,156]},
        {head:[48,132],neck:[74,136],hip:[148,146],lhand:[112,78],rhand:[78,88],lknee:[188,142],lfoot:[226,156],rknee:[194,98],rfoot:[226,98]}
      ]},
      bird_dog:{...common, prop:"tapis", cues:["À quatre pattes","Allonge opposés","Bassin stable"], poses:[
        {head:[76,82],neck:[102,98],hip:[180,126],lhand:[102,180],rhand:[142,180],lknee:[178,182],lfoot:[164,206],rknee:[218,182],rfoot:[238,206]},
        {head:[76,82],neck:[102,98],hip:[180,126],lhand:[44,122],rhand:[142,180],lknee:[178,182],lfoot:[164,206],rknee:[252,114],rfoot:[292,98]},
        {head:[76,82],neck:[102,98],hip:[180,126],lhand:[102,180],rhand:[198,122],lknee:[120,114],lfoot:[80,98],rknee:[218,182],rfoot:[238,206]}
      ]},
      front_plank:{...common, prop:"tapis", cues:["Coudes sous épaules","Ligne droite","Respire"], poses:[
        {head:[64,100],neck:[94,112],hip:[178,136],lhand:[88,184],rhand:[116,184],lknee:[196,172],lfoot:[256,184],rknee:[202,172],rfoot:[268,184]},
        {head:[64,96],neck:[94,108],hip:[178,132],lhand:[88,184],rhand:[116,184],lknee:[196,172],lfoot:[256,184],rknee:[202,172],rfoot:[268,184]},
        {head:[64,100],neck:[94,112],hip:[178,136],lhand:[88,184],rhand:[116,184],lknee:[196,172],lfoot:[256,184],rknee:[202,172],rfoot:[268,184]}
      ]},
      side_plank_knees:{...common, prop:"tapis", cues:["Côté stable","Hanches alignées","Change de côté"], poses:[
        {head:[76,124],neck:[104,130],hip:[164,146],lhand:[98,184],rhand:[130,152],lknee:[190,172],lfoot:[230,184],rknee:[198,176],rfoot:[238,188]},
        {head:[76,112],neck:[104,118],hip:[164,124],lhand:[98,184],rhand:[130,140],lknee:[190,160],lfoot:[230,178],rknee:[198,164],rfoot:[238,182]},
        {head:[76,124],neck:[104,130],hip:[164,146],lhand:[98,184],rhand:[130,152],lknee:[190,172],lfoot:[230,184],rknee:[198,176],rfoot:[238,188]}
      ]},
      hollow_hold:{...common, prop:"sol", cues:["Dos plaqué","Bras et jambes loin","Stop si cambrure"], poses:[
        {head:[52,132],neck:[78,136],hip:[150,148],lhand:[112,90],rhand:[142,88],lknee:[176,112],lfoot:[220,120],rknee:[190,118],rfoot:[238,132]},
        {head:[52,132],neck:[78,136],hip:[150,148],lhand:[62,88],rhand:[90,82],lknee:[196,146],lfoot:[254,158],rknee:[206,154],rfoot:[270,172]},
        {head:[52,132],neck:[78,136],hip:[150,148],lhand:[90,92],rhand:[120,88],lknee:[184,130],lfoot:[236,142],rknee:[196,138],rfoot:[250,154]}
      ]},
      hinge:{...common, prop:"chaise ou sol", cues:["Debout stable","Hanches arrière","Retour haut"], poses:[
        {head:[112,42],neck:[112,66],hip:[112,118],lhand:[90,116],rhand:[136,116],lknee:[100,158],lfoot:[88,196],rknee:[126,158],rfoot:[140,196]},
        {head:[150,62],neck:[146,84],hip:[112,126],lhand:[124,126],rhand:[168,126],lknee:[100,158],lfoot:[88,196],rknee:[126,158],rfoot:[140,196]},
        {head:[112,42],neck:[112,66],hip:[112,118],lhand:[90,116],rhand:[136,116],lknee:[100,158],lfoot:[88,196],rknee:[126,158],rfoot:[140,196]}
      ]},
      core:{...common, prop:"tapis", cues:["Installe-toi","Gaine doucement","Reste propre"], poses:[
        {head:[80,92],neck:[106,106],hip:[170,130],lhand:[96,174],rhand:[136,174],lknee:[172,174],lfoot:[214,194],rknee:[212,172],rfoot:[254,194]},
        {head:[80,86],neck:[106,100],hip:[170,122],lhand:[72,132],rhand:[156,132],lknee:[172,156],lfoot:[214,184],rknee:[212,156],rfoot:[254,184]},
        {head:[80,92],neck:[106,106],hip:[170,130],lhand:[96,174],rhand:[136,174],lknee:[172,174],lfoot:[214,194],rknee:[212,172],rfoot:[254,194]}
      ]},
      mobility:{...common, prop:"amplitude douce", cues:["Place-toi","Bouge lentement","Respire"], poses:[
        {head:[112,42],neck:[112,66],hip:[112,118],lhand:[76,104],rhand:[148,104],lknee:[96,158],lfoot:[78,196],rknee:[128,158],rfoot:[150,196]},
        {head:[136,48],neck:[132,72],hip:[112,118],lhand:[86,94],rhand:[190,70],lknee:[96,158],lfoot:[78,196],rknee:[128,158],rfoot:[150,196]},
        {head:[96,48],neck:[100,72],hip:[112,118],lhand:[34,70],rhand:[138,94],lknee:[96,158],lfoot:[78,196],rknee:[128,158],rfoot:[150,196]}
      ]}
    };
    return frames[kind]||frames.mobility;
  }

  function motionExtra(p){
    if(p.extra==="chair") return `<path d="M122 130h54v18h-22v56h-16v-56h-16z" class="motionProp"/><path d="M176 148v56" class="motionPropLine"/>`;
    if(p.extra==="support") return `<path d="M44 106h42v10H44z" class="motionProp"/><path d="M54 116v88M78 116v88" class="motionPropLine"/>`;
    if(p.extra==="wall") return `<path d="M56 42v164" class="motionPropLine"/><path d="M44 42h16M44 72h16M44 102h16M44 132h16M44 162h16" class="motionPropLine thin"/>`;
    if(p.extra==="band") return `<path d="M190 102 C176 110 158 112 142 104" class="motionBand"/><circle cx="194" cy="102" r="5" class="motionAnchor"/>`;
    if(p.extra==="incline") return `<path d="M104 198h58v-62h16v62h58v12H104z" class="motionProp"/>`;
    if(p.extra==="towel"||p.extra==="press") return `<path d="M158 150 q22 ${p.extra==="press"?2:9} 44 0" class="motionTowel"/>`;
    return "";
  }

  function motionSkeleton(p, gender){
    const q=k=>p[k], line=(a,b,cls="")=>`<line class="${cls}" x1="${q(a)[0]}" y1="${q(a)[1]}" x2="${q(b)[0]}" y2="${q(b)[1]}"/>`;
    const torsoWidth=gender==="female"?14:11, headHair=gender==="female"?`<path d="M${q("head")[0]-11} ${q("head")[1]-5} q-9 18 4 31" class="motionHair"/>`:"";
    return `<g class="motionPerson ${gender}">
      ${motionExtra(p)}
      ${headHair}
      <circle cx="${q("head")[0]}" cy="${q("head")[1]}" r="13" class="motionHead"/>
      <path d="M${q("neck")[0]} ${q("neck")[1]} Q ${(q("neck")[0]+q("hip")[0])/2} ${(q("neck")[1]+q("hip")[1])/2+torsoWidth} ${q("hip")[0]} ${q("hip")[1]}" class="motionTorso"/>
      ${line("neck","lhand","motionArm")}${line("neck","rhand","motionArm")}
      ${line("hip","lknee","motionLeg")}${line("lknee","lfoot","motionLeg")}
      ${line("hip","rknee","motionLeg")}${line("rknee","rfoot","motionLeg")}
      <circle cx="${q("lhand")[0]}" cy="${q("lhand")[1]}" r="5" class="motionJoint"/>
      <circle cx="${q("rhand")[0]}" cy="${q("rhand")[1]}" r="5" class="motionJoint"/>
      <circle cx="${q("lfoot")[0]}" cy="${q("lfoot")[1]}" r="6" class="motionFoot"/>
      <circle cx="${q("rfoot")[0]}" cy="${q("rfoot")[1]}" r="6" class="motionFoot"/>
    </g>`;
  }

  function motionFrame(frame, index, gender, color){
    const x=index*238+18, active=["1;.42;.42;1",".42;1;.42;.42",".42;.42;1;.42"][index];
    const border=["1;.2;.2;1",".2;1;.2;.2",".2;.2;1;.2"][index];
    return `<g transform="translate(${x},34)">
      <rect class="motionCardBg" width="216" height="214" rx="16"/>
      <rect class="motionCardFocus" width="216" height="214" rx="16" stroke="${color}">
        <animate attributeName="opacity" values="${border}" dur="3.6s" repeatCount="indefinite"/>
      </rect>
      <path d="M22 198h172" class="motionGround"/>
      <g opacity=".95">
        <animate attributeName="opacity" values="${active}" dur="3.6s" repeatCount="indefinite"/>
        ${motionSkeleton(frame, gender)}
      </g>
      <text x="18" y="25" class="motionStep">${index+1}</text>
      <text x="48" y="24" class="motionCue">${esc(frame.cue)}</text>
    </g>`;
  }

  function diagram(x){
    const data=motionFrames(x), gender=profile()?.gender==="female"?"female":"male";
    const color={core:"#2d8cff",push:"#f57b45",pull:"#735cff",legs:"#24c05a",knee_rehab:"#19a974",mobility:"#8bbf2d",cardio:"#ff4d57",warmup:"#49a99a",cooldown:"#8a9691"}[x.family]||"#2d8cff";
    const frames=data.poses.map((pose,i)=>motionFrame({...pose,cue:data.cues[i]},i,gender,color)).join("");
    return `<svg class="motionSvg" viewBox="0 0 734 306" role="img" aria-label="Animation offline ${esc(x.name)}">
      <rect width="734" height="306" rx="22" class="motionBg"/>
      <text x="24" y="28" class="motionTitle">${esc(x.name)}</text>
      <text x="710" y="28" class="motionAvatar" text-anchor="end">${gender==="female"?"Profil femme":"Profil homme"}</text>
      ${frames}
      <text x="24" y="286" class="motionMeta">${esc(data.prop)} · ${esc(data.focus)}</text>
    </svg>`;
  }

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

  function media(x,compact=false){
    const raw=state.exerciseVideos?.[x.id]||x.videoPath||"", hasVideo=!!raw&&raw!=="/"&&/\.mp4($|\?)/i.test(raw), src=hasVideo?videoSrc(x):"";
    return `${hasVideo?`<div class="videoFrame"><video controls playsinline preload="metadata" src="${esc(src)}"></video></div>`:""}<details class="motionDetails" ${compact?"":"open"}><summary>Animation offline du mouvement</summary>${diagram(x)}</details>`;
  }

  function card(x){
    const sourceLink=x.sourceUrl&&!/\.pdf($|\?)/i.test(x.sourceUrl)?`<p><a class="textLink" href="${esc(x.sourceUrl)}" target="_blank" rel="noopener">Lien explicatif</a></p>`:"";
    return `<article class="panel exercise"><div class="media">${media(x)}</div><div class="exerciseTitle"><div><p class="eyebrow">${familyLabel(x.family)} · ${x.type} · ${x.sets} série(s)</p><h2>${x.name}</h2></div><details class="editExercise"><summary title="Modifier l'URL vidéo">✎</summary><label>URL vidéo .mp4<input id="video_${x.id}" value="${esc(state.exerciseVideos?.[x.id]||x.videoPath||"")}" placeholder="https://...mp4"></label><button class="secondary" data-save-video="${x.id}">Enregistrer vidéo</button></details></div><p>${x.short}</p>${targetPanel(x)}${rehabPanel(x)}<h3>Comment faire</h3><ol>${x.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>${sourceLink}<p class="notice">${x.safety}</p></article>`;
  }
