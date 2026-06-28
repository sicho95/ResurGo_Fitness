import { useAppStore } from '../../app/store';
import { makeMinimalWeek, restartStrategy } from '../../core/adaptiveEngine';

export function PlanPage() {
  const { sessions, startSession } = useAppStore();
  return (
    <section className="stack">
      <header className="page-header">
        <div><p className="eyebrow">Phase 1</p><h1>Plan adaptatif</h1></div>
        <span className="status blue">{restartStrategy(0)}</span>
      </header>
      <div className="session-list">
        {sessions.map((session) => (
          <article className="panel session-card" key={session.id}>
            <div>
              <p className="eyebrow">Semaine {session.weekNumber} - {session.date}</p>
              <h2>{session.title}</h2>
              <p>{session.durationMinutes} min - {session.exercises.length} exercices</p>
            </div>
            <div className="actions vertical">
              <button className="primary" onClick={() => void startSession(session)}>Lancer</button>
              <button className="secondary" onClick={() => void startSession(makeMinimalWeek(session))}>Transformer en version courte</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
