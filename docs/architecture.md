# Architecture ResurGo Fitness

## Choix principal

ResurGo Fitness reste une PWA statique et offline-first, mais la maintenance ne se fait plus sur un unique artefact final.

Le modele actuel est le suivant :

- `main` contient les sources de developpement lisibles et decoupees ;
- `app/` contient les modules JavaScript source ;
- `static/` contient les fichiers statiques source ;
- `assets/` contient les medias et ressources locales ;
- `scripts/build-static.mjs` genere l'artefact publiable ;
- `WebApp` recoit uniquement le resultat genere pour GitHub Pages.

L'application publiee reste 100 % statique cote navigateur, mais elle est maintenant construite a partir d'une base source plus propre et maintenable.

## Structure des sources

- `app/` : logique applicative decoupee par responsabilite.
- `static/index.html` : shell HTML source.
- `static/styles.css` : styles mobile-first et responsive.
- `static/sw.js` : service worker source.
- `static/manifest.webmanifest` : manifeste PWA.
- `static/version.json` : version fonctionnelle source.
- `assets/` : body maps, icones et ressources offline.
- `docs/` : documentation embarquee.
- `workers/resurgo-sync/` : Worker Cloudflare optionnel.

Le fichier `app.js` publie n'est pas une source maintenue a la main. Il est genere au build par concatenation ordonnee des modules de `app/`.

## Pipeline de build

Le script `scripts/build-static.mjs` est la reference de generation.

Il fait les operations suivantes :

- lire les modules de `app/` dans un ordre de build explicite ;
- concatener ces modules pour produire `app.js` ;
- copier les fichiers de `static/` dans l'artefact final ;
- copier `assets/`, `docs/` et `workers/` ;
- injecter les metadonnees de build dans les fichiers qui portent des tokens ;
- produire un dossier `.webapp-build/` en local ou un dossier cible passe avec `--out`.

L'ordre de build est volontairement explicite via `appBuildOrder` pour eviter les regressions silencieuses lors d'un renommage ou d'un deplacement de module.

## Version et refresh PWA

Deux notions sont distinctes :

- `version` : version fonctionnelle visible du produit ;
- `buildId` : identifiant technique de build pour forcer le refresh PWA et invalider les caches quand necessaire.

Cette separation permet de republier un correctif technique sans forcer artificiellement une nouvelle version fonctionnelle.

## Publication

La branche `main` sert de depot de developpement.

La branche `WebApp` sert d'artefact de publication pour GitHub Pages :

- les sources n'y sont pas editees a la main ;
- le contenu y est regenere depuis `main` ;
- GitHub Pages doit pointer sur `WebApp` et `/root`.

Le flux attendu est :

1. modifier les sources sur `main` ;
2. verifier le build localement avec `node scripts/build-static.mjs --out <dossier>` ;
3. pousser `main` ;
4. laisser le workflow publier le resultat genere sur `WebApp`.

## Modules metier

Les modules source couvrent notamment :

- profil, tests initiaux, objectifs et ressentis ;
- planification hebdomadaire adaptative ;
- logique de seance, repos, timer et TTS ;
- bibliotheque d'exercices, fiches, medias et variantes ;
- visualisations corporelles et statistiques ;
- persistance locale IndexedDB, import/export JSON et sync optionnelle.

## Offline

Le service worker met en cache le shell applicatif publie. IndexedDB conserve les donnees utilisateur. Les videos online restent facultatives ; offline, l'application s'appuie sur les fiches locales, les visuels embarques et les animations de mouvement generees dans l'app.

## Worker

Le Worker Cloudflare reste facultatif. Il peut :

- valider un token applicatif ;
- stocker un export JSON par profil dans KV ;
- exposer un mock Garmin ;
- servir plus tard de proxy securise pour une integration Garmin reelle.

Les secrets doivent rester cote serveur, jamais dans la PWA.
