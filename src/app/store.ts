import { create } from 'zustand';
import type { ActivityEvent, AppSettings, BodyMetric, Exercise, PlannedSession, Profile, SessionRun } from '../core/types';
import { db, defaultSettings } from '../db/database';
import { generateWeek } from '../core/planGenerator';
import { createSessionRun, logSet } from '../core/sessionEngine';
import type { SessionLogSet } from '../core/types';

interface AppState {
  ready: boolean;
  settings: AppSettings;
  profiles: Profile[];
  exercises: Exercise[];
  sessions: PlannedSession[];
  activeRun: SessionRun | null;
  metrics: BodyMetric[];
  activities: ActivityEvent[];
  load: () => Promise<void>;
  createDemoProfile: () => Promise<void>;
  setActiveProfile: (profileId: string) => Promise<void>;
  generatePlan: (profileId: string) => Promise<void>;
  startSession: (session: PlannedSession) => Promise<void>;
  logCurrentSet: (log: SessionLogSet) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  addMetrics: (metrics: BodyMetric[]) => Promise<void>;
  addActivities: (activities: ActivityEvent[]) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  settings: defaultSettings,
  profiles: [],
  exercises: [],
  sessions: [],
  activeRun: null,
  metrics: [],
  activities: [],
  async load() {
    const [settings, profiles, exercises, sessions, activeRuns, metrics, activities] = await Promise.all([
      db.settings.get('app'),
      db.profiles.toArray(),
      db.exercises.toArray(),
      db.sessions.toArray(),
      db.sessionRuns.where('state').noneOf(['session_completed', 'session_aborted']).toArray(),
      db.metrics.toArray(),
      db.activities.toArray()
    ]);
    set({ ready: true, settings: settings ?? defaultSettings, profiles, exercises, sessions, activeRun: activeRuns[0] ?? null, metrics, activities });
  },
  async createDemoProfile() {
    const profile: Profile = {
      id: `profile_${Date.now()}`,
      name: 'Damien',
      createdAt: new Date().toISOString(),
      age: 40,
      heightCm: null,
      equipment: ['élastique', 'chaise', 'tapis'],
      availabilityDays: 3,
      sportsHistory: 'Ancien sportif, course actuelle 30 minutes environ.',
      goals: { mode: 'fat_loss_strength_mobility', startWeightKg: 100, targetWeightKg: 85, targetDate: '2027-06-28' },
      healthContext: { backHistory: 'hernie discale opérée ancienne', painFlags: { back: 1, knee: 0, hip: 0, tendon: 0, shoulder: 0 } },
      initialLevels: { running: 'R2', push: 'P2', pull: 'T1', legs: 'J2', frontCore: 'G2', sideCore: 'L1', mobility: 'M2' },
      dataPreferences: { primaryActivities: 'garmin', primaryWeight: 'garmin_index_s2', secondary: 'apple_health_optional', manualFallback: true, deduplication: true }
    };
    await db.profiles.put(profile);
    await get().setActiveProfile(profile.id);
    await get().generatePlan(profile.id);
    await get().load();
  },
  async setActiveProfile(profileId) {
    const settings = { ...get().settings, activeProfileId: profileId };
    await db.settings.put({ ...settings, id: 'app' });
    set({ settings });
  },
  async generatePlan(profileId) {
    const profile = await db.profiles.get(profileId);
    if (!profile) return;
    const sessions = generateWeek(profile);
    await db.sessions.bulkPut(sessions);
    set({ sessions: await db.sessions.toArray() });
  },
  async startSession(session) {
    const run = createSessionRun(session);
    await db.sessionRuns.put(run);
    set({ activeRun: run });
  },
  async logCurrentSet(log) {
    const run = get().activeRun;
    if (!run) return;
    const planned = get().sessions.find((item) => item.id === run.plannedSessionId);
    if (!planned) return;
    const next = logSet(run, planned, log);
    await db.sessionRuns.put(next);
    if (next.state === 'session_completed') await db.sessions.update(planned.id, { completedAt: next.completedAt });
    await get().load();
  },
  async updateSettings(partial) {
    const settings = { ...get().settings, ...partial };
    await db.settings.put({ ...settings, id: 'app' });
    set({ settings });
  },
  async addMetrics(metrics) {
    await db.metrics.bulkPut(metrics);
    set({ metrics: await db.metrics.toArray() });
  },
  async addActivities(activities) {
    await db.activities.bulkPut(activities);
    set({ activities: await db.activities.toArray() });
  }
}));
