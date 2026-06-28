# ResurGo Fitness

PWA coach sportif offline-first, mobile-first iPhone/iPad, avec profils, tests initiaux, plan adaptatif, séance guidée, TTS, statistiques, export/import JSON et connecteur Garmin via Cloudflare Worker.

## Démarrer

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run test
npm run build
npm run preview
npm run test:e2e
```

## V1 incluse

- PWA installable avec manifest, service worker et cache des schémas offline.
- Données locales dans IndexedDB via Dexie.
- Export/import JSON complet pour sauvegarde iCloud et migration multi-device.
- Multi-profils, profil de départ Damien, tests/niveaux par domaine.
- Plan adaptatif hebdomadaire et semaine minimale viable.
- Séance dynamique avec état sauvegardé, saisie réussite/douleur/difficulté, adaptation immédiate.
- Bibliothèque d’exercices avec SVG locaux offline et URLs vidéo placeholders online.
- TTS Web Speech API configurable.
- Statistiques poids/composition/assiduité/course sans nutrition.
- Worker Cloudflare optionnel pour proxy Garmin et stockage KV des tokens/état de sync.

## Cloudflare Worker Garmin

Le code est dans `workers/resurgo-sync`.

```bash
cd workers/resurgo-sync
npm install
npx wrangler kv namespace create RESURGO_SYNC_KV
npm run types
npm run deploy
```

Ajouter l’id KV dans `workers/resurgo-sync/wrangler.jsonc`, puis configurer les secrets :

```bash
npx wrangler secret put APP_SHARED_SYNC_TOKEN
npx wrangler secret put GARMIN_CONSUMER_KEY
npx wrangler secret put GARMIN_CONSUMER_SECRET
```

La PWA stocke l’URL Worker et le token personnel dans les réglages locaux. Le Worker stocke l’état Garmin en KV pour faciliter le multi-device.

## Limites V1

- Garmin réel nécessite accès Garmin Health/API et credentials valides. Sans cela, le Worker expose un mock et des endpoints prêts.
- Apple Santé n’est pas intégré en V1 : une PWA ne peut pas lire HealthKit directement. Une app iOS compagnon pourra pousser des données vers le Worker plus tard.
- Les vidéos externes ne sont pas cachées offline ; le fallback offline est le schéma SVG + descriptif.
- Aucun module nutrition, repas, calories ou macros.
