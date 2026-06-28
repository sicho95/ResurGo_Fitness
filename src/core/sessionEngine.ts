import type { Exercise, PlannedSession, SessionLogSet, SessionRun } from './types';

export function createSessionRun(planned: PlannedSession): SessionRun {
  return {
    id: `run_${planned.id}_${Date.now()}`,
    profileId: planned.profileId,
    plannedSessionId: planned.id,
    state: 'preview_exercise',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    setLogs: {},
    safetyAlerts: []
  };
}

export function logSet(run: SessionRun, planned: PlannedSession, log: SessionLogSet): SessionRun {
  const plannedExercise = planned.exercises[run.currentExerciseIndex];
  const logs = run.setLogs[plannedExercise.exerciseId] ?? [];
  const safetyAlerts = [...run.safetyAlerts];
  if (log.pain >= 3) safetyAlerts.push('Douleur 3+ : réduire, remplacer ou arrêter cet exercice.');
  const nextLogs = [...logs, log];
  const exerciseDone = nextLogs.length >= plannedExercise.sets || log.success === 'no' || log.pain >= 3;
  const lastExercise = run.currentExerciseIndex >= planned.exercises.length - 1;
  return {
    ...run,
    setLogs: { ...run.setLogs, [plannedExercise.exerciseId]: nextLogs },
    currentSetIndex: exerciseDone ? 0 : run.currentSetIndex + 1,
    currentExerciseIndex: exerciseDone && !lastExercise ? run.currentExerciseIndex + 1 : run.currentExerciseIndex,
    state: exerciseDone ? (lastExercise ? 'session_completed' : 'preview_exercise') : 'resting',
    completedAt: exerciseDone && lastExercise ? new Date().toISOString() : run.completedAt,
    safetyAlerts,
    updatedAt: new Date().toISOString()
  };
}

export function immediateAdvice(exercise: Exercise, latest?: SessionLogSet): string {
  if (!latest) return exercise.voiceCues.keyCue;
  if (latest.pain >= 3) return 'Priorité sécurité : stop ou version plus facile.';
  if (latest.success === 'no') return 'On réduit la difficulté et on garde la technique propre.';
  if (latest.difficulty === 'easy' && latest.success === 'yes') return 'Bonne marge : progression possible à la prochaine séance.';
  if (latest.success === 'partial') return 'On maintient le même niveau pour consolider.';
  return 'Continue propre, sans chercher l’échec.';
}
