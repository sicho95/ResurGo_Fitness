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
