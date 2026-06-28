import { Link } from 'react-router-dom';
import { AlertTriangle, Play, Sparkles } from 'lucide-react';
import { useAppStore } from '../../app/store';
import { decideWeek } from '../../core/adaptiveEngine';
import { averageWeight } from '../../core/stats';

export function TodayPage() {
  const { profiles, settings, sessions, metrics, createDemoProfile } = useAppStore();
  const profile = profiles.find((item) => item.id === settings.activeProfileId);
  const nextSession = sessions.find((item) => !item.completedAt);
  const avgWeight = averageWeight(metrics, 7);
  const decision = profile ? decideWeek(profile, {
    adherencePercent: 75,
    backPain: profile.healthContext.painFlags.back ?? 0,
    kneeTendonPain: Math.max(profile.healthContext.painFlags.knee ?? 0, profile.healthContext.painFlags.tendon ?? 0),
    fatigue: 2,
    weightTrendKg28d: -0.4,
    sessionsDone: sessions.filter((s) => s.completedAt).length,
    sessionsPlanned: Math.max(1, sessions.length),
    runDone: sessions.some((s) => s.type === 'run' && s.completedAt),
    mobilityDone: true
  }) : null;

  if (!profile) {
    return (
      <section className="hero">
        <div>
          <p className="eyebrow">Coach local-first</p>
          <h1>ResurGo Fitness</h1>
          <p>Crée un profil, génère un plan adaptatif, lance une séance guidée et garde tes données en local.</p>
          <button className="primary" onClick={() => void createDemoProfile()}><Sparkles size={18} /> Créer le profil de départ</button>
        </div>
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bonjour {profile.name}</p>
          <h1>Aujourd’hui</h1>
        </div>
        <div className={`status ${decision?.color}`}>{decision?.label}</div>
      </header>
      <div className="grid two">
        <article className="panel highlight">
          <p className="eyebrow">Séance recommandée</p>
          <h2>{nextSession?.title ?? 'Plan à jour'}</h2>
          <p>{nextSession ? `${nextSession.durationMinutes} min - ${nextSession.exercises.length} blocs` : 'Aucune séance restante cette semaine.'}</p>
          <div className="actions">
            <Link className="primary" to="/session"><Play size={18} /> Démarrer</Link>
            <Link className="secondary" to="/plan">Version courte</Link>
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Signaux</p>
          <div className="metric-row"><span>Poids 7j</span><strong>{avgWeight ? `${avgWeight.toFixed(1)} kg` : 'À saisir'}</strong></div>
          <div className="metric-row"><span>Douleur dos</span><strong>{profile.healthContext.painFlags.back ?? 0}/5</strong></div>
          <div className="metric-row"><span>Décision</span><strong>{decision?.reason}</strong></div>
        </article>
      </div>
      <article className="notice"><AlertTriangle size={18} /> Cette app ne remplace pas un médecin ou un kiné. Stop si douleur irradiée, faiblesse ou engourdissement.</article>
    </section>
  );
}
