import { addDays, formatISO } from 'date-fns';
import type { PlannedSession, Profile } from './types';

export function generateWeek(profile: Profile, start = new Date(), phase = 1, weekNumber = 1): PlannedSession[] {
  const base = `week_${profile.id}_${weekNumber}`;
  const runningLevel = profile.initialLevels.running ?? 'R2';
  const runSeconds = runningLevel === 'R0' || runningLevel === 'R1' ? 1200 : 1800;
  const sessions: PlannedSession[] = [
    {
      id: `${base}_strength_a`,
      profileId: profile.id,
      date: formatISO(start, { representation: 'date' }),
      title: 'Force profonde',
      type: 'strength',
      durationMinutes: 35,
      phase,
      weekNumber,
      exercises: [
        { exerciseId: 'dead_bug', sets: 3, reps: 8, restSeconds: 40 },
        { exerciseId: 'bird_dog', sets: 3, reps: 8, restSeconds: 40 },
        { exerciseId: 'incline_pushup', sets: 3, reps: 10, restSeconds: 60 },
        { exerciseId: 'band_row', sets: 3, reps: 12, restSeconds: 50 },
        { exerciseId: 'sit_to_stand', sets: 3, reps: 12, restSeconds: 60 }
      ]
    },
    {
      id: `${base}_run`,
      profileId: profile.id,
      date: formatISO(addDays(start, 2), { representation: 'date' }),
      title: runningLevel === 'R0' || runningLevel === 'R1' ? 'Marche-course facile' : 'Course facile',
      type: 'run',
      durationMinutes: Math.round(runSeconds / 60),
      phase,
      weekNumber,
      exercises: [{ exerciseId: 'easy_run', sets: 1, seconds: runSeconds, restSeconds: 0 }]
    },
    {
      id: `${base}_strength_b`,
      profileId: profile.id,
      date: formatISO(addDays(start, 4), { representation: 'date' }),
      title: 'Renfo mobilité',
      type: 'strength',
      durationMinutes: 30,
      phase,
      weekNumber,
      exercises: [
        { exerciseId: 'hip_flexor_mobility', sets: 2, seconds: 35, restSeconds: 20 },
        { exerciseId: 'bird_dog', sets: 3, reps: 8, restSeconds: 40 },
        { exerciseId: 'sit_to_stand', sets: 3, reps: 12, restSeconds: 60 },
        { exerciseId: 'band_row', sets: 3, reps: 12, restSeconds: 50 }
      ]
    }
  ];
  return sessions;
}
