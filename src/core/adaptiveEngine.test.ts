import { describe, expect, it } from 'vitest';
import { decideWeek, restartStrategy } from './adaptiveEngine';
import type { Profile } from './types';

const profile: Profile = {
  id: 'p',
  name: 'Damien',
  createdAt: '2026-06-28',
  equipment: [],
  availabilityDays: 3,
  sportsHistory: '',
  goals: { mode: 'fat_loss_strength_mobility', startWeightKg: 90, targetWeightKg: 85, targetDate: '2027-06-28' },
  healthContext: { painFlags: { back: 0, knee: 0, hip: 0, tendon: 0, shoulder: 0 } },
  initialLevels: { running: 'R2', push: null, pull: null, legs: null, frontCore: null, sideCore: null, mobility: null },
  dataPreferences: { primaryActivities: 'garmin', primaryWeight: 'garmin_index_s2', secondary: 'apple_health_optional', manualFallback: true, deduplication: true }
};

describe('adaptive engine', () => {
  it('protects on pain 3+', () => {
    const decision = decideWeek(profile, { adherencePercent: 90, backPain: 3, kneeTendonPain: 0, fatigue: 2, weightTrendKg28d: -1, sessionsDone: 3, sessionsPlanned: 3, runDone: true, mobilityDone: true });
    expect(decision.color).toBe('red');
  });

  it('allows second run only on strong safe conditions', () => {
    const decision = decideWeek(profile, { adherencePercent: 90, backPain: 0, kneeTendonPain: 0, fatigue: 2, weightTrendKg28d: -1, sessionsDone: 3, sessionsPlanned: 3, runDone: true, mobilityDone: true });
    expect(decision.color).toBe('green');
    expect(decision.allowSecondRun).toBe(true);
  });

  it('maps long stop to full assessment', () => {
    expect(restartStrategy(70)).toBe('Nouveau bilan complet');
  });
});
