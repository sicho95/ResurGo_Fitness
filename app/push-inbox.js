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
