import { describe, expect, it } from 'vitest';
import { mergeActivities } from './dedup';
import type { ActivityEvent, DataSourceConfig } from './types';

const sources: DataSourceConfig[] = [
  { id: 'garmin', kind: 'mock_garmin', enabled: true, priority: 1, label: 'Garmin' },
  { id: 'manual', kind: 'manual', enabled: true, priority: 3, label: 'Manuel' }
];

describe('dedup', () => {
  it('keeps priority source for duplicate activities', () => {
    const base: ActivityEvent = { id: 'a', profileId: 'p', source: 'manual', type: 'run', startedAt: '2026-06-28T08:00:00Z', durationSeconds: 1800, distanceMeters: 4000 };
    const garmin: ActivityEvent = { ...base, id: 'b', source: 'mock_garmin', startedAt: '2026-06-28T08:05:00Z', durationSeconds: 1780, distanceMeters: 4100 };
    const merged = mergeActivities([base, garmin], sources);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('mock_garmin');
  });
});
