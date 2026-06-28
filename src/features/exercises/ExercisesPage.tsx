import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAppStore } from '../../app/store';
import type { ExerciseFamily } from '../../core/types';

const families: Array<ExerciseFamily | 'all'> = ['all', 'core', 'push', 'pull', 'legs', 'mobility', 'agility', 'cardio', 'warmup', 'cooldown'];

export function ExercisesPage() {
  const { exercises } = useAppStore();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<ExerciseFamily | 'all'>('all');
  const filtered = useMemo(() => exercises.filter((exercise) => {
    const matchFamily = family === 'all' || exercise.family === family;
    const matchQuery = `${exercise.name} ${exercise.goals.join(' ')} ${exercise.muscles.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    return matchFamily && matchQuery;
  }), [exercises, family, query]);

  return (
    <section className="stack">
      <header className="page-header"><div><p className="eyebrow">Offline + vidéo online</p><h1>Exercices</h1></div></header>
      <div className="toolbar">
        <label className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher" /></label>
        <div className="chips">{families.map((item) => <button key={item} className={family === item ? 'chip active' : 'chip'} onClick={() => setFamily(item)}>{item}</button>)}</div>
      </div>
      <div className="exercise-grid">
        {filtered.map((exercise) => (
          <article className="panel exercise-card" key={exercise.id}>
            <img src={exercise.media.offlineDiagram} alt="" />
            <div>
              <p className="eyebrow">{exercise.family} - {exercise.level}</p>
              <h2>{exercise.name}</h2>
              <p>{exercise.description.short}</p>
              <a href={exercise.media.onlineVideoUrl} target="_blank" rel="noreferrer">Vidéo online placeholder</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
