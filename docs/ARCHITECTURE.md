# Architecture ResurGo Fitness

## Vue d’ensemble

ResurGo est local-first :

- `IndexedDB` est la source active de l’app sur l’appareil.
- `Export/import JSON` permet la sauvegarde souveraine et le transfert via iCloud.
- `Cloudflare Worker + KV` gère la passerelle Garmin, les tokens et l’état de sync multi-device.
- Les moteurs métier sont purs et testés dans `src/core`.

## Frontend

- `src/app` : shell, navigation, store Zustand.
- `src/db` : Dexie, version IndexedDB, seed initial.
- `src/core` : moteurs adaptatif, séance, stats, export/import, TTS, anti-doublon.
- `src/features` : UI par domaine.
- `public/assets/exercises` : schémas SVG locaux cachés par la PWA.

## Worker

`workers/resurgo-sync` expose :

- `GET /health`
- `GET /v1/connectors`
- `GET /v1/garmin/status`
- `POST /v1/garmin/mock-sync`
- `POST /v1/import/json`
- `GET /v1/profiles/:profileId/events`
- `POST /v1/apple/native-push` futur compagnon iOS

KV stocke les événements normalisés et accueillera les tokens Garmin OAuth. D1 n’est pas nécessaire en V1.
