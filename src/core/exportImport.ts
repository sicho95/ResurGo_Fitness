import type { AppExport } from './types';
import { appExportSchema } from './schema';
import { db, defaultSettings } from '../db/database';

export async function exportAll(includeSecrets = false): Promise<AppExport> {
  const settings = (await db.settings.get('app')) ?? defaultSettings;
  const sources = await db.dataSources.toArray();
  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    appSettings: {
      ...settings,
      tts: settings.tts
    },
    profiles: await db.profiles.toArray(),
    exerciseLibrary: await db.exercises.toArray(),
    sessions: await db.sessions.toArray(),
    sessionRuns: await db.sessionRuns.toArray(),
    metrics: await db.metrics.toArray(),
    activities: await db.activities.toArray(),
    dataSources: includeSecrets ? sources : sources.map((source) => ({ ...source, lastSyncAt: source.lastSyncAt })),
    syncEvents: await db.syncEvents.toArray()
  };
}

export async function importAll(payload: unknown) {
  const parsed = appExportSchema.parse(payload) as AppExport;
  await db.transaction('rw', [db.settings, db.profiles, db.exercises, db.sessions, db.sessionRuns, db.metrics, db.activities, db.dataSources, db.syncEvents], async () => {
    await db.settings.put({ ...parsed.appSettings, id: 'app' });
    await db.profiles.bulkPut(parsed.profiles);
    await db.exercises.bulkPut(parsed.exerciseLibrary);
    await db.sessions.bulkPut(parsed.sessions);
    await db.sessionRuns.bulkPut(parsed.sessionRuns);
    await db.metrics.bulkPut(parsed.metrics);
    await db.activities.bulkPut(parsed.activities);
    await db.dataSources.bulkPut(parsed.dataSources);
    await db.syncEvents.bulkPut(parsed.syncEvents);
  });
  return parsed;
}

export function previewImport(payload: unknown) {
  const parsed = appExportSchema.parse(payload) as AppExport;
  return {
    schemaVersion: parsed.schemaVersion,
    exportedAt: parsed.exportedAt,
    profiles: parsed.profiles.length,
    exercises: parsed.exerciseLibrary.length,
    sessions: parsed.sessions.length,
    metrics: parsed.metrics.length,
    activities: parsed.activities.length,
    sources: parsed.dataSources.length
  };
}
