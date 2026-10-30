"use strict";
(() => {
  const $ = id => document.getElementById(id);
  let token = "";
  const status = msg => { $("status").textContent = msg; };
  const make = (tag, text, cls = "") => {
    const e = document.createElement(tag); e.textContent = text; if(cls) e.className = cls; return e;
  };
  async function req(path, method = "GET", body = null) {
    if (!token) throw Error("Authentification requise.");
    const response = await fetch(path, {
      method, cache:"no-store",
      headers: {"Authorization": "Bearer " + token, "Content-Type": "application/json"},
      ...(body === null ? {} : {body: JSON.stringify(body)})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error("Requête refusée (" + response.status + ").");
    return data;
  }
  async function connect() {
    token = $("adminToken").value.trim();
    $("adminToken").value = "";
    try {
      const data = await req("/health");
      if (!data.ok) throw Error("Service indisponible");
      $("panel").hidden = false;
      status("Connexion privée validée.");
      await refresh();
    } catch (e) { token = ""; $("panel").hidden = true; status(e.message); }
  }
  async function refresh() {
    try {
      const data = await req("/admin/profiles");
      $("profiles").replaceChildren();
      for (const p of data.profiles || []) {
        const wrap = make("div", "", "item"); wrap.textContent = "";
        wrap.append(make("strong", p.label), make("p", p.id + " — " + p.devices + " appareil(s)", "muted"));
        const btn = make("button", "Afficher les appareils", "secondary");
        const target = make("div", "");
        btn.addEventListener("click", async () => {
          try {
            const out = await req("/admin/profiles/" + encodeURIComponent(p.id) + "/devices");
            target.replaceChildren();
            for(const d of out.devices || []) {
              const line = make("div", "", "item");
              line.append(make("span", d.label + " — " + (d.revoked_at ? "révoqué" : "actif") + " "));
              if (!d.revoked_at) {
                const revoke = make("button", "Révoquer", "danger");
                revoke.addEventListener("click", async () => {
                  if (!confirm("Révoquer cet appareil ? Il devra être réappairé.")) return;
                  try { await req("/admin/devices/" + encodeURIComponent(d.id) + "/revoke", "POST"); await refresh(); }
                  catch(e) { status(e.message); }
                });
                line.append(revoke);
              }
              target.append(line);
            }
          } catch(e) { status(e.message); }
        });
        wrap.append(btn, target); $("profiles").append(wrap);
      }
      status("Profils chargés.");
    } catch(e) { status(e.message); }
  }
  async function createProfile() {
    const label = $("label").value.trim();
    if(!label) { status("Saisir un libellé."); return; }
    try {
      const data = await req("/admin/profiles","POST",{label});
      $("pairing").replaceChildren(
        make("p","Code d'inscription à usage unique (valable 10 minutes) :"),
        make("strong",data.enrollmentCode,"code"),
        make("p","À saisir dans l'application ResurGo lors de l'association d'un appareil.","muted")
      );
      $("label").value = ""; await refresh();
    } catch(e) { status(e.message); }
  }
  $("connect").addEventListener("click",connect);
  $("disconnect").addEventListener("click",()=>{token = ""; $("panel").hidden = true; $("pairing").replaceChildren();status("Session effacée.");});
  $("refresh").addEventListener("click",refresh);
  $("create").addEventListener("click",createProfile);
  window.addEventListener("pagehide",()=>{token = ""; $("adminToken").value = "";});
})();
