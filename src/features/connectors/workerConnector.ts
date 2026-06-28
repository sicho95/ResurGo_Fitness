import type { ActivityEvent, BodyMetric } from '../../core/types';

export interface WorkerConnectorSettings {
  workerUrl: string;
  appToken: string;
}

async function callWorker<T>(settings: WorkerConnectorSettings, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${settings.workerUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(settings.appToken ? { authorization: `Bearer ${settings.appToken}` } : {}),
      ...init.headers
    }
  });
  if (!response.ok) throw new Error(`Worker ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getWorkerStatus(settings: WorkerConnectorSettings) {
  return callWorker<{ ok: boolean; connectors: Array<{ kind: string; status: string }> }>(settings, '/v1/connectors');
}

export async function syncMockGarmin(settings: WorkerConnectorSettings, profileId: string) {
  return callWorker<{ ok: boolean; metrics: BodyMetric[]; activities: ActivityEvent[] }>(settings, '/v1/garmin/mock-sync', {
    method: 'POST',
    body: JSON.stringify({ profileId })
  });
}

export async function fetchWorkerEvents(settings: WorkerConnectorSettings, profileId: string) {
  return callWorker<{ ok: boolean; metrics: BodyMetric[]; activities: ActivityEvent[] }>(settings, `/v1/profiles/${encodeURIComponent(profileId)}/events`);
}
