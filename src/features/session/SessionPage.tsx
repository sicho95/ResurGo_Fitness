import { useMemo } from 'react';
import { useAppStore } from '../../app/store';
import { immediateAdvice } from '../../core/sessionEngine';

export function SessionPage() {
  const { activeRun, sessions, exercises, logCurrentSet } = useAppStore();
  const planned = sessions.find((item) => item.id === activeRun?.plannedSessionId);
  const plannedExercise = planned?.exercises[activeRun?.currentExerciseIndex ?? 0];
  const exercise = exercises.find((item) => item.id === plannedExercise?.exerciseId);
  const latest = useMemo(() => {
    if (!activeRun || !plannedExercise) return undefined;
    return activeRun.setLogs[plannedExercise.exerciseId]?.at(-1);
  }, [activeRun, plannedExercise]);

  if (!activeRun || !planned || !exercise || !plannedExercise) {
    return <section className="empty"><h1>Séance</h1><p>Lance une séance depuis Aujourd’hui ou Plan.</p></section>;
  }
  if (activeRun.state === 'session_completed') {
    return <section className="hero"><h1>Séance terminée</h1><p>Historique enregistré localement.</p></section>;
  }

  return (
    <section className="session-runner">
      <div className="runner-media">
        <img src={exercise.media.offlineDiagram} alt="" />
        <a href={exercise.media.onlineVideoUrl} target="_blank" rel="noreferrer">Vidéo online</a>
      </div>
      <div className="runner-panel">
        <p className="eyebrow">Exercice {activeRun.currentExerciseIndex + 1}/{planned.exercises.length} - Série {activeRun.currentSetIndex + 1}/{plannedExercise.sets}</p>
        <h1>{exercise.name}</h1>
        <p>{exercise.description.short}</p>
        <ul className="cue-list">
          {exercise.description.keyPoints.map((point) => <li key={point}>{point}</li>)}
        </ul>
        <p className="coach-tip">{immediateAdvice(exercise, latest)}</p>
        <div className="runner-actions">
          <button className="primary" onClick={() => void logCurrentSet({ setIndex: activeRun.currentSetIndex, success: 'yes', actualReps: plannedExercise.reps, actualSeconds: plannedExercise.seconds, difficulty: 'ok', pain: 0 })}>Réussi</button>
          <button className="secondary" onClick={() => void logCurrentSet({ setIndex: activeRun.currentSetIndex, success: 'partial', actualReps: Math.max(1, (plannedExercise.reps ?? 8) - 2), actualSeconds: plannedExercise.seconds, difficulty: 'hard', pain: 1 })}>Partiel</button>
          <button className="danger" onClick={() => void logCurrentSet({ setIndex: activeRun.currentSetIndex, success: 'no', difficulty: 'too_hard', pain: 3, painZone: 'à préciser' })}>Douleur / Stop</button>
        </div>
      </div>
    </section>
  );
}
