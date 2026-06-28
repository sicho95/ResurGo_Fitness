import { NavLink, Outlet } from 'react-router-dom';
import { Activity, BarChart3, Dumbbell, Home, Settings, Timer } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from './store';

const nav = [
  { to: '/', label: 'Aujourd’hui', icon: Home },
  { to: '/plan', label: 'Plan', icon: Activity },
  { to: '/session', label: 'Séance', icon: Timer },
  { to: '/exercises', label: 'Exercices', icon: Dumbbell },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/settings', label: 'Réglages', icon: Settings }
];

export function App() {
  const { ready, load, settings } = useAppStore();
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  if (!ready) return <main className="boot">ResurGo charge ton coach local...</main>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span>RG</span><strong>ResurGo</strong></div>
        <nav>
          {nav.map((item) => <NavButton key={item.to} {...item} />)}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {nav.map((item) => <NavButton key={item.to} {...item} />)}
      </nav>
    </div>
  );
}

function NavButton({ to, label, icon: Icon }: (typeof nav)[number]) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end={to === '/'}>
      <Icon size={20} aria-hidden />
      <span>{label}</span>
    </NavLink>
  );
}
