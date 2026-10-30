  // ResurGo Sync v0.2 — IndexedDB-first; canonical profile entities and CAS conflicts.
  // Production requires Safari and real NAS acceptance tests.
  let nasSyncBusy=false, nasSyncDelay=null, nasSyncStarted=false, nasApplyingRemote=false;
  const nasKinds=[
    ["profiles","profile_settings"],
    ["plans","plan"],["activities","activity"],["metrics","measurement"],
    ["sessionRuns","record"],["assessments","feedback"]
  ];
  const nasEntityKey=(kind,id)=>kind+":"+id;
  function nasOwnProfileItems(owner){
    if(!owner)return [];
    const result=[];
    for(const [field,kind] of nasKinds){
      if(!Array.isArray(state[field]))continue;
      for(const item of state[field]){
        if(!item?.id)continue;
        if(field==="profiles"?(item.id!==owner):(item.profileId!==owner))continue;
        const payload=kind==="profile_settings"?{profile:clone(item)}:clone(item);
        result.push({kind,entityId:String(item.id),payload,field});
      }
    }
    return result;
  }
  function nasLocalFingerprint(value){return JSON.stringify(value);}
  async function nasSyncLoadMeta(conn){
    const stored=await get("nasSyncMeta");
    if(stored?.profileId===conn.profileId && stored.deviceId===conn.deviceId)return stored;
    const initial={profileId:conn.profileId,deviceId:conn.deviceId,cursor:0,
      revisions:{},hashes:{},outbox:[],conflicts:[],initialized:false,
      syncLastAt:null,error:null};
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
    const items=nasOwnProfileItems(conn.localProfileId||meta.remotePrimaryProfileId||state.activeProfileId);
    const pending=new Map(meta.outbox.map(x=>[nasEntityKey(x.entityType,x.entityId),x]));
    for(const item of items){
      const key=nasEntityKey(item.kind,item.entityId),value=nasLocalFingerprint(item.payload);
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
        if(!meta.initialized&&evt.kind==="profile_settings"&&evt.payload?.profile?.id)
          meta.remotePrimaryProfileId=meta.remotePrimaryProfileId||evt.payload.profile.id;
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
          if(!meta.conflicts.some(x=>x.kind===evt.kind&&x.entityId===evt.entity_id))
            meta.conflicts.push({kind:evt.kind,entityId:evt.entity_id,
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
  async function nasSyncDisplayStatus(){
    const conn=await nasStoredConnection();
    const meta=conn?.token?await nasSyncLoadMeta(conn):null;
    const result=el("nasSyncStatus");
    if(result)result.textContent=!conn?.token?"Non associé au NAS.":(
      "Dernière synchronisation : "+(meta?.syncLastAt?
        new Date(meta.syncLastAt).toLocaleString("fr-FR"):"aucune")+
      ". En attente : "+(meta?.outbox.length||0)+
      ". Conflits : "+(meta?.conflicts.length||0)+
      (meta?.error?". Problème : "+meta.error:"")
    );
  }
