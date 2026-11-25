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
  let coachAudioStatus="Prêt",coachAudioSequence=0;
  function coachVoiceStatus(message){coachAudioStatus=message;for(const id of ["coachAudioStatus","liveAudioStatus"]){const node=el(id);if(node)node.textContent=message;}}
  function coachSelectedAudioMode(){return state.settings?.tts?.audioModeRevision===2?state.settings.tts.audioMode||"playback":"playback";}
  function coachAudioMode(force=null){
    const mode=force||coachSelectedAudioMode(),type=["ambient","transient","playback","auto"].includes(mode)?mode:"playback";
    try{if(navigator.audioSession)navigator.audioSession.type=type;}catch{}
    return type;
  }
  function coachReleaseAudio(audio){
    if(!audio||coachVoiceAudio!==audio)return;
    // Keep the same media element, as iOS grants playback on an element basis.
    try{audio.pause();}catch{}
    try{if(navigator.audioSession)navigator.audioSession.type="auto";}catch{}
  }
  function voiceSpeakId(id,voiceKind=null){
    const kind=voiceKind||state.settings?.tts?.pregeneratedVoice||"feminine";
    if(!["feminine","masculine"].includes(kind)||!/^phrase_0(?:[0-7][0-9]|80)$/.test(id))return Promise.resolve(false);
    // Known local pack paths: no manifest await before play, preserving the tap gesture.
    const fileUrl=voicePackBase+kind+"/"+id+".mp3";
    const token=++coachAudioSequence;
    const audio=coachVoiceAudio||(coachVoiceAudio=new Audio());
    audio.pause();
    coachAudioMode();
    audio.preload="auto";audio.muted=false;
    const volume=Number(state.settings?.tts?.volume??1);
    audio.volume=Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):1;
    audio.playbackRate=1;
    audio.onplaying=()=>{if(token===coachAudioSequence)coachVoiceStatus("Lecture du coach en cours.");};
    audio.onended=()=>{if(token===coachAudioSequence){coachReleaseAudio(audio);coachVoiceStatus("Message terminé · vérifier le son à l’oreille.");}};
    audio.onerror=()=>{if(token===coachAudioSequence){coachReleaseAudio(audio);coachVoiceStatus("Erreur de lecture audio "+(audio.error?.code||"inconnue")+". Relancer le test vocal.");}};
    audio.src=fileUrl;
    coachVoiceStatus("Lecture demandée…");
    const play=()=>{try{return Promise.resolve(audio.play());}catch(err){return Promise.reject(err);}};
    return play().then(()=>true).catch(err=>{
      if(token!==coachAudioSequence)return false;
      coachReleaseAudio(audio);coachVoiceStatus("Lecture refusée : "+(err?.name||"erreur")+". Toucher Tester la voix.");
      throw err;
    });
  }
  async function coachTestVoice(){
    try{const ok=await voiceSpeakId("phrase_010");if(!ok)throw Error("Fichier vocal indisponible");}
    catch(err){alert("Test vocal : "+(err?.message||String(err))+". Vérifier le volume multimédia et le mode audio. Si Safari reste silencieux, fermer l’onglet puis rouvrir ResurGo.");}
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
