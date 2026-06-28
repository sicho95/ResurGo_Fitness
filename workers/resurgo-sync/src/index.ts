type ConnectorKind = 'manual' | 'json_import' | 'mock_garmin' | 'mock_apple_health' | 'garmin_cloudflare_proxy' | 'apple_native_push';

type NormalizedMetric = {
  id: string;
  profileId: string;
  source: ConnectorKind;
  measuredAt: string;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  bodyWaterPct?: number;
};

type NormalizedActivity = {
  id: string;
  profileId: string;
  source: ConnectorKind;
  type: 'run' | 'walk' | 'strength' | 'mobility' | 'bike' | 'cardio';
  startedAt: string;
  durationSeconds: number;
  distanceMeters?: number;
  externalId?: string;
};

type StoredEvents = {
  profileId: string;
  updatedAt: string;
  metrics: NormalizedMetric[];
  activities: NormalizedActivity[];
};

function json(data: unknown, init: ResponseInit = {}, origin = '*') {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
      'cache-control': 'no-store',
      ...init.headers
    }
  });
}

function cors(request: Request, env: Cloudflare.Env) {
  const origin = request.headers.get('origin') ?? '*';
  if (!env.APP_ORIGIN || env.APP_ORIGIN === '*' || origin === env.APP_ORIGIN) return origin;
  return env.APP_ORIGIN;
}

async function requireAuth(request: Request, env: Cloudflare.Env, origin: string) {
  if (!env.APP_SHARED_SYNC_TOKEN) {
    return json({ ok: false, error: 'server_auth_not_configured' }, { status: 503 }, origin);
  }
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${env.APP_SHARED_SYNC_TOKEN}`;
  if (header === expected) return null;
  return json({ ok: false, error: 'unauthorized' }, { status: 401 }, origin);
}

async function readEvents(env: Cloudflare.Env, profileId: string): Promise<StoredEvents> {
  const existing = await env.RESURGO_SYNC_KV.get<StoredEvents>(`profile:${profileId}:events`, 'json');
  return existing ?? { profileId, updatedAt: new Date(0).toISOString(), metrics: [], activities: [] };
}

async function writeEvents(env: Cloudflare.Env, events: StoredEvents) {
  await env.RESURGO_SYNC_KV.put(`profile:${events.profileId}:events`, JSON.stringify({
    ...events,
    updatedAt: new Date().toISOString()
  }));
}

function profileIdFromBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const value = (body as { profileId?: unknown }).profileId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function mergeUnique<T extends { id: string }>(current: T[], incoming: T[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values());
}

async function handleMockGarmin(request: Request, env: Cloudflare.Env, origin: string) {
  const authError = await requireAuth(request, env, origin);
  if (authError) return authError;
  const body = await request.json().catch(() => null);
  const profileId = profileIdFromBody(body);
  if (!profileId) return json({ ok: false, error: 'profileId_required' }, { status: 400 }, origin);

  const now = new Date();
  const metric: NormalizedMetric = {
    id: `mock_garmin_metric_${profileId}_${now.toISOString().slice(0, 10)}`,
    profileId,
    source: 'mock_garmin',
    measuredAt: now.toISOString(),
    weightKg: 99.4,
    bodyFatPct: 28.2,
    muscleMassKg: 67.1,
    bodyWaterPct: 51.5
  };
  const activity: NormalizedActivity = {
    id: `mock_garmin_run_${profileId}_${now.toISOString().slice(0, 10)}`,
    profileId,
    source: 'mock_garmin',
    type: 'run',
    startedAt: new Date(now.getTime() - 36e5).toISOString(),
    durationSeconds: 1800,
    distanceMeters: 4100,
    externalId: `garmin-demo-${profileId}`
  };
  const events = await readEvents(env, profileId);
  await writeEvents(env, {
    ...events,
    metrics: mergeUnique(events.metrics, [metric]),
    activities: mergeUnique(events.activities, [activity])
  });
  return json({ ok: true, metrics: [metric], activities: [activity] }, {}, origin);
}

async function handleImport(request: Request, env: Cloudflare.Env, origin: string) {
  const authError = await requireAuth(request, env, origin);
  if (authError) return authError;
  const body = await request.json().catch(() => null);
  const profileId = profileIdFromBody(body);
  if (!profileId) return json({ ok: false, error: 'profileId_required' }, { status: 400 }, origin);
  const incomingMetrics = Array.isArray((body as { metrics?: unknown }).metrics)
    ? (body as { metrics: NormalizedMetric[] }).metrics
    : [];
  const incomingActivities = Array.isArray((body as { activities?: unknown }).activities)
    ? (body as { activities: NormalizedActivity[] }).activities
    : [];
  const events = await readEvents(env, profileId);
  await writeEvents(env, {
    ...events,
    metrics: mergeUnique(events.metrics, incomingMetrics.map((item) => ({ ...item, profileId, source: item.source ?? 'json_import' }))),
    activities: mergeUnique(events.activities, incomingActivities.map((item) => ({ ...item, profileId, source: item.source ?? 'json_import' })))
  });
  return json({ ok: true, importedMetrics: incomingMetrics.length, importedActivities: incomingActivities.length }, {}, origin);
}

async function handleAppleNativePush(request: Request, env: Cloudflare.Env, origin: string) {
  const authError = await requireAuth(request, env, origin);
  if (authError) return authError;
  return handleImport(request, env, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = cors(request, env);

    if (request.method === 'OPTIONS') return json({ ok: true }, {}, origin);
    if (url.pathname === '/health') return json({ ok: true, service: 'resurgo-fitness-sync', time: new Date().toISOString() }, {}, origin);
    if (url.pathname === '/v1/connectors') {
      return json({
        ok: true,
        connectors: [
          { kind: 'garmin_cloudflare_proxy', status: env.GARMIN_CONSUMER_KEY && env.GARMIN_CONSUMER_SECRET ? 'configured' : 'not_configured' },
          { kind: 'json_import', status: 'ready' },
          { kind: 'mock_garmin', status: 'ready' },
          { kind: 'apple_native_push', status: 'future_native_companion' }
        ]
      }, {}, origin);
    }
    if (url.pathname === '/v1/garmin/status') {
      return json({
        ok: true,
        configured: Boolean(env.GARMIN_CONSUMER_KEY && env.GARMIN_CONSUMER_SECRET),
        note: env.GARMIN_CONSUMER_KEY ? 'Garmin credentials present.' : 'Garmin Health API credentials must be added as Worker secrets.'
      }, {}, origin);
    }
    if (url.pathname === '/v1/garmin/mock-sync' && request.method === 'POST') return handleMockGarmin(request, env, origin);
    if (url.pathname === '/v1/import/json' && request.method === 'POST') return handleImport(request, env, origin);
    if (url.pathname === '/v1/apple/native-push' && request.method === 'POST') return handleAppleNativePush(request, env, origin);

    const eventsMatch = url.pathname.match(/^\/v1\/profiles\/([^/]+)\/events$/);
    if (eventsMatch && request.method === 'GET') {
      const authError = await requireAuth(request, env, origin);
      if (authError) return authError;
      return json({ ok: true, ...(await readEvents(env, decodeURIComponent(eventsMatch[1]))) }, {}, origin);
    }

    if (url.pathname.startsWith('/v1/garmin/') && !env.GARMIN_CONSUMER_KEY) {
      return json({ ok: false, error: 'garmin_not_configured', message: 'Add Garmin API secrets to enable real Garmin synchronization.' }, { status: 501 }, origin);
    }

    return json({ ok: false, error: 'not_found' }, { status: 404 }, origin);
  }
} satisfies ExportedHandler<Cloudflare.Env>;
