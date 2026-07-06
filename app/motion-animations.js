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
    const data=motionFrames(x), kind=motionKind(x), gender=profile()?.gender==="female"?"female":"male";
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
    return `${hasVideo?`<div class="videoFrame"><video controls playsinline preload="metadata" src="${esc(src)}"></video></div>`:""}<details class="motionDetails" ${compact?"":"open"}><summary>Diaporama offline en boucle</summary>${diagram(x)}</details>`;
  }

  function card(x){
    const sourceLink=x.sourceUrl&&!/\.pdf($|\?)/i.test(x.sourceUrl)?`<p><a class="textLink" href="${esc(x.sourceUrl)}" target="_blank" rel="noopener">Lien explicatif</a></p>`:"";
    return `<article class="panel exercise"><div class="media">${media(x)}</div><div class="exerciseTitle"><div><p class="eyebrow">${familyLabel(x.family)} · ${x.type} · ${x.sets} série(s)</p><h2>${x.name}</h2></div><details class="editExercise"><summary title="Modifier l'URL vidéo">✎</summary><label>URL vidéo .mp4<input id="video_${x.id}" value="${esc(state.exerciseVideos?.[x.id]||x.videoPath||"")}" placeholder="https://...mp4"></label><button class="secondary" data-save-video="${x.id}">Enregistrer vidéo</button></details></div><p>${x.short}</p>${targetPanel(x)}${rehabPanel(x)}<h3>Comment faire</h3><ol>${x.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>${sourceLink}<p class="notice">${x.safety}</p></article>`;
  }
  globalThis.__resurgoExerciseDiagram = diagram;
