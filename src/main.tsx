import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { TodayPage } from './features/plan/TodayPage';
import { PlanPage } from './features/plan/PlanPage';
import { SessionPage } from './features/session/SessionPage';
import { ExercisesPage } from './features/exercises/ExercisesPage';
import { StatsPage } from './features/stats/StatsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ensureSeedData } from './db/database';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'session', element: <SessionPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'settings', element: <SettingsPage /> }
    ]
  }
]);

ensureSeedData().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
});

registerSW({ immediate: true });
