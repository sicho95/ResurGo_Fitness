import { describe, expect, it } from 'vitest';
import { createSessionRun, logSet } from './sessionEngine';
import type { PlannedSession } from './types';

const planned: PlannedSession = {
  id: 's',
  profileId: 'p',
  date: '2026-06-28',
  title: 'Test',
  type: 'strength',
  durationMinutes: 10,
  phase: 1,
  weekNumber: 1,
  exercises: [{ exerciseId: 'bird_dog', sets: 1, reps: 8, restSeconds: 30 }]
};

describe('session engine', () => {
  it('completes a one-set session', () => {
    const run = createSessionRun(planned);
    const next = logSet(run, planned, { setIndex: 0, success: 'yes', actualReps: 8, difficulty: 'ok', pain: 0 });
    expect(next.state).toBe('session_completed');
    expect(next.completedAt).toBeTruthy();
  });
});
