import Dexie, { type Table } from 'dexie';
import type {
  ActivityEvent,
  AppSettings,
  BodyMetric,
  DataSourceConfig,
  Exercise,
  PlannedSession,
  Profile,
  SessionRun,
  SyncEvent
} from '../core/types';
import { exerciseSeed } from '../data/exercises';
import { defaultTtsSettings } from '../core/tts';

export class ResurGoDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  settings!: Table<AppSettings & { id: string }, string>;
  exercises!: Table<Exercise, string>;
  sessions!: Table<PlannedSession, string>;
  sessionRuns!: Table<SessionRun, string>;
  metrics!: Table<BodyMetric, string>;
  activities!: Table<ActivityEvent, string>;
  dataSources!: Table<DataSourceConfig, string>;
  syncEvents!: Table<SyncEvent, string>;

  constructor() {
    super('resurgo_fitness_v1');
    this.version(1).stores({
      profiles: 'id, name, createdAt',
      settings: 'id, activeProfileId',
      exercises: 'id, family, level',
      sessions: 'id, profileId, date, type, completedAt',
      sessionRuns: 'id, profileId, plannedSessionId, state, updatedAt',
      metrics: 'id, profileId, measuredAt, source',
      activities: 'id, profileId, startedAt, source, type',
      dataSources: 'id, kind, enabled, priority',
      syncEvents: 'id, source, happenedAt, status'
    });
  }
}

export const db = new ResurGoDatabase();

export const defaultSettings: AppSettings & { id: string } = {
  id: 'app',
  activeProfileId: null,
  theme: 'system',
  tts: defaultTtsSettings
};

export async function ensureSeedData() {
  const [settingsCount, exerciseCount, sourceCount] = await Promise.all([
    db.settings.count(),
    db.exercises.count(),
    db.dataSources.count()
  ]);
  if (settingsCount === 0) await db.settings.put(defaultSettings);
  if (exerciseCount === 0) await db.exercises.bulkPut(exerciseSeed);
  if (sourceCount === 0) {
    await db.dataSources.bulkPut([
      { id: 'manual', kind: 'manual', enabled: true, priority: 3, label: 'Saisie manuelle' },
      { id: 'json_import', kind: 'json_import', enabled: true, priority: 2, label: 'Import JSON' },
      { id: 'mock_garmin', kind: 'mock_garmin', enabled: true, priority: 1, label: 'Garmin mock' },
      { id: 'mock_apple_health', kind: 'mock_apple_health', enabled: false, priority: 4, label: 'Apple Santé futur' }
    ]);
  }
}
