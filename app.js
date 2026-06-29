(() => {
  const parts = ["assets/app/part-00.js","assets/app/part-01.js","assets/app/part-02.js","assets/app/part-03.js","assets/app/part-04.js","assets/app/part-05.js","assets/app/part-06.js","assets/app/part-07.js","assets/app/part-08.js","assets/app/part-09.js"];
  Promise.all(parts.map(p => fetch(p, { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(p); return r.text(); })))
    .then(chunks => { (0, eval)(chunks.join("")); })
    .catch(err => {
      const el = document.getElementById("app");
      if (el) el.innerHTML = '<main class="app"><section class="panel"><h1>ResurGo Fitness</h1><p>Impossible de charger l&rsquo;application. Recharge quand le réseau est disponible.</p><p class="muted">' + String(err.message || err) + '</p></section></main>';
    });
})();
