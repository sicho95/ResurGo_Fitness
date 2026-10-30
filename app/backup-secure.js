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
