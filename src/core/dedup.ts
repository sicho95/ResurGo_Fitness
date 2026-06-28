import type { ActivityEvent, DataSourceConfig } from './types';

function near(a: number, b: number, tolerance: number): boolean {
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) <= Math.max(a, b) * tolerance;
}

export function isDuplicateActivity(a: ActivityEvent, b: ActivityEvent): boolean {
  const startDelta = Math.abs(new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  const durationClose = near(a.durationSeconds, b.durationSeconds, 0.15);
  const distanceClose = a.distanceMeters == null || b.distanceMeters == null
    ? true
    : near(a.distanceMeters, b.distanceMeters, 0.15);
  return a.type === b.type && startDelta <= 10 * 60 * 1000 && durationClose && distanceClose;
}

export function mergeActivities(events: ActivityEvent[], sources: DataSourceConfig[]): ActivityEvent[] {
  const priority = new Map(sources.map((source) => [source.kind, source.priority]));
  const sorted = [...events].sort((a, b) => (priority.get(a.source) ?? 99) - (priority.get(b.source) ?? 99));
  const merged: ActivityEvent[] = [];
  for (const event of sorted) {
    if (!merged.some((existing) => isDuplicateActivity(existing, event))) {
      merged.push(event);
    }
  }
  return merged.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}
