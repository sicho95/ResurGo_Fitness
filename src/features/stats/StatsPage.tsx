import { Activity, Ruler, Scale } from 'lucide-react';
import { useAppStore } from '../../app/store';
import { adherence, averageWeight, totalRunDistance, weightTrend } from '../../core/stats';

export function StatsPage() {
  const { metrics, sessions, activities } = useAppStore();
  const avg7 = averageWeight(metrics, 7);
  const trend = weightTrend(metrics);
  const runKm = totalRunDistance(activities) / 1000;
  return (
    <section className="stack">
      <header className="page-header"><div><p className="eyebrow">Sans nutrition</p><h1>Statistiques</h1></div></header>
      <div className="grid three">
        <StatCard icon={<Scale />} label="Poids moyen 7j" value={avg7 ? `${avg7.toFixed(1)} kg` : 'À saisir'} />
        <StatCard icon={<Activity />} label="Assiduité" value={`${adherence(sessions)} %`} />
        <StatCard icon={<Ruler />} label="Course cumulée" value={`${runKm.toFixed(1)} km`} />
      </div>
      <article className="panel">
        <h2>Composition corporelle</h2>
        <p>Garmin Index S2 est prévu comme source prioritaire via Worker Cloudflare. Les valeurs sont utilisées en tendance, pas comme vérité absolue.</p>
        <div className="metric-row"><span>Tendance poids</span><strong>{trend.toFixed(1)} kg</strong></div>
        <div className="metric-row"><span>Dernière masse grasse</span><strong>{metrics.at(-1)?.bodyFatPct ? `${metrics.at(-1)?.bodyFatPct} %` : 'Non disponible'}</strong></div>
      </article>
      <article className="panel">
        <h2>Douleurs et fatigue</h2>
        <p>Les douleurs 3+ déclenchent la protection : arrêt course temporaire, mobilité/gainage profond, consultation si signal inquiétant.</p>
      </article>
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="panel stat-card">{icon}<span>{label}</span><strong>{value}</strong></article>;
}
