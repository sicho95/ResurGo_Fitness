// Exposer un Worker minimal pour la synchro distante et le mock Garmin.
// Le routage reste volontairement simple et lisible sans framework.
const json = (body, status = 200, origin = "*") => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  }
});

function authorized(request, env) {
  if (!env.APP_SHARED_SYNC_TOKEN) return true;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${env.APP_SHARED_SYNC_TOKEN}`;
}

export default {
  async fetch(request, env) {
    const origin = env.APP_ORIGIN || "*";
    if (request.method === "OPTIONS") return json({ ok: true }, 200, origin);
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401, origin);

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "resurgo-sync-worker" }, 200, origin);
    }

    if (url.pathname === "/v1/sync/push" && request.method === "POST") {
      const body = await request.json();
      if (!body.profileId || !body.data) return json({ error: "profileId and data required" }, 400, origin);
      await env.RESURGO_SYNC_KV.put(`profile:${body.profileId}:snapshot`, JSON.stringify({
        savedAt: new Date().toISOString(),
        data: body.data
      }));
      return json({ ok: true }, 200, origin);
    }

    if (url.pathname === "/v1/sync/pull" && request.method === "POST") {
      const body = await request.json();
      if (!body.profileId) return json({ error: "profileId required" }, 400, origin);
      const raw = await env.RESURGO_SYNC_KV.get(`profile:${body.profileId}:snapshot`);
      return json(raw ? JSON.parse(raw) : { data: null }, 200, origin);
    }

    if (url.pathname === "/v1/garmin/mock-sync" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const profileId = body.profileId || "profile_mock";
      return json({
        metrics: [{
          id: `metric_garmin_mock_${Date.now()}`,
          profileId,
          source: "mock_garmin",
          measuredAt: new Date().toISOString(),
          weightKg: 99.4,
          bodyFatPct: 27.5,
          waistCm: null
        }],
        activities: [{
          id: `activity_garmin_mock_${Date.now()}`,
          profileId,
          source: "mock_garmin",
          type: "walk",
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          durationSeconds: 1800
        }]
      }, 200, origin);
    }

    return json({ error: "not_found" }, 404, origin);
  }
};
