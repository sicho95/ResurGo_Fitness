# ResurGo Fitness

PWA sportive offline-first 100% statique, prête pour GitHub Pages.

## Source et publication

- `main` contient l'unique source de développement, découpée à la racine du dépôt ;
- `app/` contient la logique JavaScript découpée par responsabilités (`bootstrap`, `exercise-library`, `planning-state`, `views`, `rendering`, `init`) ;
- `static/` contient les fichiers statiques source (`index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`, `version.json`, `icon.svg`) ;
- la branche `WebApp` est générée automatiquement pour GitHub Pages ;
- `node scripts/build-static.mjs` construit un build local dans `.webapp-build/`.

Le workflow GitHub concatène les modules de `app/` dans un ordre de build explicite pour produire `app.js`, injecte les métadonnées de build et copie les statiques vers `.webapp-build/`, puis force le contenu sur `WebApp`.

## Déploiement GitHub Pages

Configuration :

- Source : `Deploy from a branch`
- Branch : `WebApp`
- Folder : `/root`

URL attendue :

```text
https://sicho95.github.io/ResurGo_Fitness/
```

## Fonctionnalités V1

- multi-profils locaux ;
- tests initiaux et niveaux par famille ;
- plan hebdomadaire adaptatif ;
- semaine minimale viable ;
- séance dynamique guidée ;
- prévisualisation, timer, séries, douleur, difficulté, réussite ;
- repos visible entre séries, compte à rebours vocal, reprise manuelle quand l'utilisateur est prêt ;
- TTS navigateur configurable, avec lecture guidée des consignes une par une et mini-pauses naturelles ;
- bibliothèque élargie d'exercices avec fiches détaillées, étapes, sécurité et schémas SVG animés offline ;
- vidéos online intégrées quand une URL directe `.mp4` est disponible ; pas d'ouverture externe imposée ;
- statistiques poids/corps/activité avec graphiques ;
- dashboard stats mobile inspiré Garmin : mini-cartes, jauges, courbes rapides et mode sombre premium ;
- thème `Auto système`, `Sombre` ou `Clair` dans les réglages ;
- écran séance plus friendly façon coach premium : objectif clair, séries visibles, repos manuel, zones travaillées ;
- visualisation locale offline des muscles sollicités par exercice ;
- saisie manuelle course/marche : durée, distance, vitesse moyenne, fréquence cardiaque moyenne/max, ressenti, douleur ;
- saisie manuelle balance type Garmin Index S2 : poids, graisse, eau, IMC, masse osseuse, muscle, tour ventre ;
- sources de données manuelle, JSON, mock Garmin et Worker ;
- stockage IndexedDB ;
- service worker offline ;
- export/import JSON complet, avec option d'inclure ou non le token Worker ;
- code Worker Cloudflare optionnel dans `workers/resurgo-sync/`.

## Modèle de données

Voir `docs/data-model.md`.

## Architecture

Voir `docs/architecture.md`.

## Garmin et Cloudflare

La PWA fonctionne sans Garmin et sans Worker. Pour une synchronisation Garmin réelle, ne jamais mettre de secret Garmin dans `app.js`. Le Worker Cloudflare sert de proxy sécurisé et de stockage KV optionnel.

La V1 inclut :

- champs Worker dans les réglages ;
- appel `/health` ;
- appel mock `/v1/garmin/mock-sync` ;
- code de Worker prêt à adapter.

Garmin Connect officiel nécessite un accès API Garmin approuvé. Sans cet accès, la V1 reste utilisable en manuel et par import JSON.

## Limites iOS/PWA

- Apple Health n'est pas intégré en V1.
- Une PWA iOS n'a pas un accès complet et direct à Santé comme une app native.
- Les notifications, le TTS et l'installation PWA dépendent des règles Safari/iOS.
- Les vidéos ne sont pas mises en cache : offline, l'app affiche le schéma animé et le descriptif.
