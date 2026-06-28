import type { ActivityEvent, BodyMetric, PlannedSession } from './types';

export function averageWeight(metrics: BodyMetric[], days: number, now = new Date()) {
  const min = now.getTime() - days * 24 * 60 * 60 * 1000;
  const values = metrics.filter((m) => m.weightKg != null && new Date(m.measuredAt).getTime() >= min).map((m) => m.weightKg as number);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function weightTrend(metrics: BodyMetric[]) {
  const sorted = metrics.filter((m) => m.weightKg != null).sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
  if (sorted.length < 2) return 0;
  return (sorted[sorted.length - 1].weightKg ?? 0) - (sorted[0].weightKg ?? 0);
}

export function adherence(sessions: PlannedSession[]) {
  const planned = sessions.length;
  const done = sessions.filter((s) => s.completedAt).length;
  return planned === 0 ? 0 : Math.round((done / planned) * 100);
}

export function totalRunDistance(activities: ActivityEvent[]) {
  return activities.filter((a) => a.type === 'run').reduce((sum, activity) => sum + (activity.distanceMeters ?? 0), 0);
}
