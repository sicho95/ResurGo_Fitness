# Architecture ResurGo Fitness V1

## Choix principal

La V1 est volontairement une PWA vanilla statique :

- hébergement direct GitHub Pages ;
- aucun build ;
- aucun workflow GitHub Actions ;
- aucun chemin `/src/main.tsx` qui peut casser le MIME type ;
- toutes les données utilisateur en IndexedDB locale ;
- service worker pour le shell offline.

## Modules

- `index.html` : shell HTML minimal.
- `styles.css` : design mobile-first, safe-area iOS, tablette responsive.
- `app.js` : application complète, moteurs métier, IndexedDB, import/export, TTS.
- `sw.js` : cache offline du shell.
- `manifest.webmanifest` : installation PWA.
- `workers/resurgo-sync/worker.js` : Worker Cloudflare optionnel.

## Moteurs métier

- Profil : données corporelles, douleurs, fatigue, historique sportif, préférences de source.
- Tests : niveaux running, push, pull, jambes, gainage frontal, gainage latéral, mobilité.
- Plan : génération de semaine, version courte, protection selon douleur/fatigue.
- Séance : exercice courant, séries, timer, TTS, douleur, réussite, résumé.
- Repos : compte à rebours affiché et vocal, puis reprise manuelle de la série suivante.
- Adaptation : progression, maintien, correction, protection.
- Données : mesures manuelles, pesées complètes, activités course/marche, imports JSON, mock Garmin.

## Offline

Le service worker met en cache le shell applicatif. IndexedDB conserve les données. Les vidéos restent online uniquement. Chaque exercice garde une fiche texte et un schéma SVG animé utilisables offline.

## Worker

Le Worker est facultatif. Il peut :

- valider un token applicatif ;
- stocker un export JSON par profil dans KV ;
- exposer un mock Garmin ;
- accueillir plus tard OAuth/API Garmin côté serveur.

Les secrets Garmin doivent rester dans Cloudflare Secrets ou dans un backend équivalent, jamais dans la PWA.
