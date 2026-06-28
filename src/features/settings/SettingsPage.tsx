import { Download, Mic, Upload, Wifi } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../app/store';
import { exportAll, importAll, previewImport } from '../../core/exportImport';
import { fetchWorkerEvents, getWorkerStatus, syncMockGarmin, type WorkerConnectorSettings } from '../connectors/workerConnector';

export function SettingsPage() {
  const { settings, updateSettings, profiles, addMetrics, addActivities } = useAppStore();
  const [worker, setWorker] = useState<WorkerConnectorSettings>({ workerUrl: localStorage.getItem('resurgo_worker_url') ?? '', appToken: localStorage.getItem('resurgo_worker_token') ?? '' });
  const [message, setMessage] = useState('');
  const activeProfileId = settings.activeProfileId;

  async function downloadExport() {
    const payload = await exportAll(false);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resurgo-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    const payload = JSON.parse(await file.text());
    const preview = previewImport(payload);
    await importAll(payload);
    setMessage(`Import OK : ${preview.profiles} profils, ${preview.sessions} séances, ${preview.metrics} métriques.`);
    window.location.reload();
  }

  function saveWorker() {
    localStorage.setItem('resurgo_worker_url', worker.workerUrl);
    localStorage.setItem('resurgo_worker_token', worker.appToken);
    setMessage('Configuration Worker enregistrée localement.');
  }

  async function testWorker() {
    const status = await getWorkerStatus(worker);
    setMessage(`Worker OK : ${status.connectors.map((item) => `${item.kind}=${item.status}`).join(', ')}`);
  }

  async function mockSync() {
    if (!activeProfileId) return;
    const result = await syncMockGarmin(worker, activeProfileId);
    await addMetrics(result.metrics);
    await addActivities(result.activities);
    setMessage(`Mock Garmin sync : ${result.metrics.length} métrique, ${result.activities.length} activité.`);
  }

  async function pullEvents() {
    if (!activeProfileId) return;
    const result = await fetchWorkerEvents(worker, activeProfileId);
    await addMetrics(result.metrics);
    await addActivities(result.activities);
    setMessage(`Événements Worker importés : ${result.metrics.length} métriques, ${result.activities.length} activités.`);
  }

  return (
    <section className="stack">
      <header className="page-header"><div><p className="eyebrow">Profils, voix, sync</p><h1>Réglages</h1></div></header>
      <div className="grid two">
        <article className="panel">
          <h2>Profils</h2>
          {profiles.map((profile) => <div className="metric-row" key={profile.id}><span>{profile.name}</span><strong>{profile.goals.targetWeightKg} kg cible</strong></div>)}
        </article>
        <article className="panel">
          <h2><Mic size={18} /> Coach vocal</h2>
          <label className="toggle"><input type="checkbox" checked={settings.tts.enabled} onChange={(event) => void updateSettings({ tts: { ...settings.tts, enabled: event.target.checked } })} /> Activé</label>
          <label>Vitesse <input type="range" min="0.7" max="1.4" step="0.1" value={settings.tts.rate} onChange={(event) => void updateSettings({ tts: { ...settings.tts, rate: Number(event.target.value) } })} /></label>
          <button className="secondary" onClick={() => speechSynthesis.speak(new SpeechSynthesisUtterance('ResurGo est prêt pour la séance.'))}>Tester la voix</button>
        </article>
      </div>
      <article className="panel">
        <h2><Wifi size={18} /> Worker Cloudflare Garmin</h2>
        <p>Le Worker stocke les tokens et l’état Garmin en KV. La PWA reste offline-first et récupère des événements normalisés.</p>
        <label>URL Worker<input value={worker.workerUrl} onChange={(event) => setWorker({ ...worker, workerUrl: event.target.value })} placeholder="https://resurgo-fitness-sync.xxx.workers.dev" /></label>
        <label>Token app personnel<input value={worker.appToken} onChange={(event) => setWorker({ ...worker, appToken: event.target.value })} placeholder="Bearer secret configuré côté Worker" type="password" /></label>
        <div className="actions">
          <button className="secondary" onClick={saveWorker}>Enregistrer</button>
          <button className="secondary" onClick={() => void testWorker()}>Tester</button>
          <button className="primary" onClick={() => void mockSync()}>Mock Garmin sync</button>
          <button className="secondary" onClick={() => void pullEvents()}>Importer Worker</button>
        </div>
      </article>
      <article className="panel">
        <h2>Sauvegarde JSON iCloud</h2>
        <p>Export complet sans secrets par défaut. Utilise iCloud pour transférer ton fichier entre iPhone/iPad.</p>
        <div className="actions">
          <button className="primary" onClick={() => void downloadExport()}><Download size={18} /> Exporter JSON</button>
          <label className="file-button"><Upload size={18} /> Importer JSON<input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && void importFile(event.target.files[0])} /></label>
        </div>
      </article>
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
