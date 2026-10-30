# ResurGo Fitness — Synchronisation local-first multi-appareils sur NAS QNAP

**Statut : PROPOSITION d'architecture à évaluer et prototyper.** Damien propose le 2026-10-30 de s'appuyer, si cela aide, sur un **conteneur Docker dédié sur le NAS**, à l'image d'AlphaTerminal. L'objectif confirmé est une **synchronisation automatique entre appareils**, sans sacrifier l'autonomie locale. L'utilisation du NAS en tant qu'unique backend n'est pas encore un choix irréversible.

**Référence technique analysée :** `sicho95/AlphaTerminal`, notamment `worker/docker-compose.yml`, `worker/README.md`, `worker/app/db.py` et `js/sync-client.js` : Python/FastAPI, SQLite WAL, volume `/data`, jetons par appareil, association avec approbation, révisions CAS, conflits explicites, sauvegardes. **Ne pas réutiliser les données, le stockage, les secrets ou les ports d'AlphaTerminal pour ResurGo**.

## 1. Objectifs et non-objectifs

### Exigences confirmées
- **SYNC-001** Chaque téléphone reste pleinement fonctionnel hors ligne : profils, programmes, séances, collecte capteurs, coaching vocal, historique, saisie des données et calculs. La sauvegarde locale est immédiate.
- **SYNC-002** En présence d'une connexion autorisée, transférer automatiquement les nouveaux événements vers les autres appareils associés au **même profil**, puis récupérer leurs changements.
- **SYNC-003** Respecter l'indépendance des profils familiaux. Un iPhone peut héberger plusieurs profils, mais aucun profil ne doit recevoir les données d'un autre sans partage explicitement autorisé.
- **SYNC-004** Tolérer pannes NAS, absence Internet, changement Wi-Fi/4G/5G et déconnexion Tailscale sans perdre ni bloquer la séance.
- **SYNC-005** Synchroniser plans, records, séances, statistiques corporelles, préférences, progression, bibliothèque d'exercices personnalisée et retours de douleur volontairement stockés ; **ne pas** exporter les flux capteurs bruts, médias ou sons systématiquement.
- **SYNC-006** Ne jamais créer de double activité quand Garmin, Apple Santé, montre, téléphone ou import externe représentent une même séance.
- **SYNC-007** Toute modification locale reste récupérable ; les conflits ne doivent pas entraîner d'écrasement silencieux.
- **SYNC-008** Les paramètres sensibles, données médicales et identifiants d'appairage restent privés, séparés et protégés.
- **SYNC-009** Le système de sync ne participe **jamais** à la décision du coach en direct : un moteur d'effort ne doit pas attendre une API.

### Non-objectifs initiaux
- Pas de partage public de séances ni de compte social.
- Pas de sauvegarde NAS obligatoire pour démarrer l'application.
- Pas d'obligation de serveur cloud commercial ni de compte Apple développeur pour synchroniser la PWA lorsqu'elle est ouverte.
- Pas de synchronisation forcée de flux GPS/FC seconde par seconde vers le NAS : privilégier activité terminée/points utiles compressés, sous politique choisie.
- Pas de commande de la séance Garmin ni d'Apple Watch depuis le NAS.

## 2. Topologie proposée

```text
iPhone 15 Pro / iPhone 13 / iPad
 ├─ PWA ResurGo (IndexedDB = données et opérations locales)
 ├─ compagnons natifs possibles (HealthKit / BLE / watchOS)
 ├─ Outbox locale persistante, versions et curseurs
 └─ SyncClient HTTPS (quand app active + événements réseau)
                         ⇅
                  Tailscale Serve privé (préféré)
             ou HTTPS exposé avec protection renforcée
                         ⇅
NAS QNAP NAS-DAMIEN — Docker Compose
 └─ resurgo-sync (API dédiée ; suggestion : Python FastAPI)
     ├─ SQLite WAL persistant /data (par profils, devices, events, revisions)
     ├─ Auth séparée pour chaque appareil et chaque profil
     ├─ Journal de changements incrémental et résolution de conflit
     ├─ Sauvegarde/restauration versionnée, contrôle de santé
     └─ Journal technique sans contenu médical nominatif
```

Le serveur NAS agit comme **point de convergence et de diffusion**, pas comme dépendance vitale de l'UI ni du coach. Les horloges murales des iPhone ne doivent pas être utilisées comme arbitre unique de conflit ; préférer séquences et révisions côté serveur.

## 3. Architecture de données et stockage

**Local** :
- IndexedDB local pour PWA, tables `entities`, `syncOutbox`, `syncCursors`, `syncDevices`, `syncConflicts`, `syncStatus`, métadonnées et migrations.
- Chaque création/modification entraîne **dans la même transaction IndexedDB** une mutation locale et une entrée Outbox. Eviter perdre l'outbox si le téléphone ferme l'onglet.
- Une modification possède `operationId` UUID, `deviceId`, `profileId`, `entityType`, `entityId`, `baseRevision`, `payload`, `schemaVersion`, `createdAt`, `idempotencyKey`.
- Les suppressions sont des tombstones datés/versionnés, conservés jusqu'à ce que les appareils aient pu converger ; pas de suppression des données d'un autre profil.
- Résumés de séances et traces utiles à l'entraînement peuvent être synchronisés ; séries brutes de mesures, trajectoires détaillées et données de santé très sensibles doivent avoir une politique de granularité/rétention spécifique et consentie.

**NAS** :
- SQLite à transactions courtes et journal WAL, tables `profiles`, `devices`, `pairings`, `events`, `entity_heads`, `tombstones`, `client_cursors`, `backups`. Aucune base ni token AlphaTerminal partagés.
- Contrôle CAS (`expectedRevision`) lors des mutations ; `operationId` unique pour les retransmissions idempotentes ; curseur monotone pour les `pull`.
- Limiter taille/volume des requêtes, cadence, nombre d'appareils et stockage ; règles mesurées, non définies arbitrairement.
- Les données ne doivent pas dépendre d'une instance volatile du conteneur : volume `/data` persistant et sauvegarde NAS séparée.

## 4. Stratégie de fusion par type d'objet

| Objet | Politique recommandée |
|---|---|
| Activité terminée | Objet immuable `activityId` + provenance + IDs externes Garmin/Apple ; les corrections deviennent des révisions, jamais deux activités identiques comptées deux fois |
| Échantillons d'activité | Associés à l'ID d'activité ; transférés par blocs optionnels si la précision historique le justifie, pas par défaut chaque seconde |
| Records personnels | Événements avec preuve/source/date ; mise à jour seulement après validation ; pas d'écrasement silencieux |
| Plan hebdomadaire | Historique des versions et source du recalcul ; modifications concurrentes → conflit ou proposition explicite de fusion |
| Séances complétées et ressentis | Entrées conservées, ordre logique, dédoublonnage par ID ; ne pas écraser un ressenti de l'autre téléphone |
| Mesures corporelles | Entrées par `measurementId` et date de mesure ; provenance, correction versionnée |
| Réglages indépendants | Fusion par clé si modifications indépendantes ; même clé modifiée simultanément → arbitrage ou stratégie déclarée |
| Préférences audio et langue | Définir ce qui relève du profil vs du terminal ; le casque/montre actuellement connectés restent **locaux à l'appareil** |
| Consentements / santé | Ne jamais fusionner permissions OS ; option de sync chiffrée uniquement si consentement explicite |
| Capteurs reconnus | Catalogue de types potentiellement partagé, mais secrets et appairages Bluetooth locaux au terminal |

### Gestion des doublons
Identifiants source natifs (Garmin/HealthKit) quand existants, empreinte robuste temporelle/distance/sport avec **validation** des collisions ; deux entraînements proches ne sont pas nécessairement doublons. En cas d'incertitude, proposer un choix utilisateur.

## 5. Protocole API proposé (sous /api/v1)

- `GET /health` : état technique, sans données ni secret.
- `POST /profiles/create` : création protégée par anti-abus et quotas, profil autonome.
- `POST /devices/pair/start`, `/approve`, `/claim` : connexion de second appareil avec autorisation depuis appareil déjà lié ou mécanisme de récupération documenté.
- `GET /devices`, `POST /devices/{id}/revoke` : voir et révoquer les terminaux.
- `POST /sync/push` : lots idempotents avec révisions attendues ; réponse par opération acceptée/refusée/conflit.
- `GET /sync/pull?cursor=...` : événements nouveaux du profil, curseur monotone, pagination bornée.
- `GET /sync/status` : appareils, retard, version de schéma, statut d'outbox.
- `POST /backup`, `POST /restore` : format chiffré et restaurations contrôlées, à ne pas confondre avec la réconciliation normale.

**Authentification :** bearer séparé par terminal et profil, jeton fort, haché sur NAS, révocable ; HTTPS pour chaque accès, contrôle d'autorisation systématique sur toute route de donnée, appairage à durée courte et à approbation explicite. Si un seul appareil est perdu, pouvoir le révoquer sans interrompre les autres.

**Protection des données personnelles :** le TLS/Tailscale protège en transit mais ne signifie pas que la base SQLite au repos soit illisible. Envisager chiffrement applicatif par profil pour données médicales privées et sauvegardes ; gérer clés/récupération sans stocker les secrets en dur dans GitHub Pages. Ne pas stocker de clé universelle dans JS public.

## 6. Cycles de synchronisation

### Sur PWA iOS
- Toujours écrire localement avant toute demande réseau.
- Essayer le push/pull à l'ouverture, au retour au premier plan, après modification importante lorsque l'app est ouverte, après reprise du réseau, et périodiquement **uniquement tant que l'application reste active**.
- Ne pas promettre une synchronisation fiable de PWA iOS totalement fermée : les APIs web Background Sync et Periodic Background Sync ne sont pas prises en charge dans Safari iOS selon les tables de compatibilité consultées en octobre 2026.
- À l'ouverture suivante, pousser d'abord les opérations conservées, récupérer celles des autres appareils, puis recalculer les vues concernées. Pas d'écrasement par simple `pull` d'un snapshot du NAS.

### Via application native iOS future
- Travail réseau en arrière-plan selon règles iOS et autorisations, éventuellement `BGTaskScheduler`, sans promesse de cadence stricte.
- Les séances watchOS remontent d'abord vers le téléphone/HealthKit selon la session native ; le NAS n'est pas dans la boucle de coaching live.

### Panne NAS/Internet
- La séance continue et s'enregistre localement.
- Outbox conservée durablement ; retry progressif, connexion non bloquante ; statut « à synchroniser ».
- Au retour du NAS, rejouer idempotemment puis fusionner ; conflits non résolus signalés sans perte d'original.
- Le NAS n'est pas l'unique sauvegarde ; exports JSON locaux versionnés et sauvegardes SQLite restent requis.

## 7. NAS, réseau et déploiement

**Matériel et existant :** QNAP TS-253B (J3455, 4 Go RAM) déjà utilisé pour plusieurs conteneurs. Examiner la charge RAM/CPU et le volume disque avant déploiement ; ne pas répliquer toute une stack lourde s'il suffit d'un service léger, SQLite et un conteneur.

**Bonne pratique (AlphaTerminal) :** conteneur non-root, `read_only`, `no-new-privileges`, suppression de capabilities, volume dédié `/data`, healthcheck, limite ressources calibrée après mesure, port publié sur `127.0.0.1` uniquement, HTTPS via proxy/tunnel séparé, secrets dans un `.env` non versionné.

**Réseau privé préféré :** Tailscale Serve (accessible au tailnet et soumis à ses ACL) ; ne pas remplacer par Funnel sans décision : **Funnel rend le service publiquement accessible**, même si le HTTPS est actif. L'utilisation de Funnel exige une authentification forte, contrôles anti-abus, revue exposition et consentement explicite.

**CORS :** n'autoriser que les origines de PWA réelles (`https://sicho95.github.io` notamment), et ne jamais considérer CORS comme une authentification. Tester Safari iOS, port HTTPS et certificat avant l'appairage.

**Isolation :** garder base, image, secret, configuration Serve/Funnel et URL de ResurGo entièrement séparés d'AlphaTerminal, Forgejo, Home Assistant, SichoAgent, etc. Ne pas modifier les services existants durant la preuve de concept.

**Sauvegardes :** sauvegarder la SQLite de manière cohérente en tenant compte de WAL (SQLite backup API ou arrêt contrôlé), plus secrets de récupération, configuration; tester restauration complète sur volume isolé. Ne pas copier à chaud uniquement `.sqlite3` si WAL actif.

## 8. Problème à résoudre dans l'ancien Worker Cloudflare

Le fichier existant `workers/resurgo-sync/worker.js` stocke actuellement un **snapshot entier** dans KV à `/v1/sync/push` et relit un snapshot à `/v1/sync/pull`. Il n'implémente **pas** de fusion concurrente, de révisions par entité, d'appairage par appareil ou de journal idempotent. Son `authorized()` accepte toute requête si `APP_SHARED_SYNC_TOKEN` n'est pas configuré : **inadapté à la synchronisation de données personnelles en production**.

**CONTRAINTE de migration :** ne pas activer une synchronisation automatique avec ce code comme s'il était un moteur robuste ; soit le mettre hors service pour les données réelles, soit l'isoler pour les mocks/import legacy, puis remplacer la fonctionnalité par le nouveau serveur NAS sécurisé. Conserver les exports existants, planifier une migration sans perdre les profils déjà utilisés.

## 9. Comparaison des trois options (décision finale encore ouverte)

| Option | Atouts | Limites |
|---|---|---|
| **Docker NAS + SQLite (préférence proposée)** | Souveraineté des données, continuité AlphaTerminal, coûts de service faibles, réutilisation d'expérience | NAS doit être disponible pour converger ; maintenance, accès distant et sauvegardes ; tests CPU/RAM |
| Cloudflare Worker + stockage approprié | Accessible mondialement via HTTPS, pas de maintenance NAS | Dépendance tierce et modèle de données à refondre ; données potentiellement hors NAS |
| Export/import JSON | Fonctionne sans serveur, réversible | Pas de véritable synchronisation automatique |

La proposition NAS est cohérente avec l'objectif de Damien. Elle est **retenue comme piste prioritaire pour prototypage**, pas déclarée « déployée » ni « testée ».

## 10. Recette technique NAS (avant activation)

1. Vérifier capacité NAS, sauvegardes et ressources disponibles sans toucher aux autres conteneurs.
2. Lancer conteneur test isolé, base vide et utilisateurs fictifs ; requête /health et test de récupération.
3. Appairer deux clients de test avec tokens différents ; vérifier isolation des profils et révocation.
4. Faire dix modifications hors ligne sur les deux appareils, avec chevauchement volontaire ; vérifier que toutes les opérations non conflictuelles convergent et que les conflits restent explicites.
5. Tester même activité importée Garmin/Apple et saisie depuis l'iPhone : pas de double comptage.
6. Modifier un plan sur chaque appareil ; tester l'absence d'écrasement silencieux.
7. Simuler perte NAS, coupure Wi-Fi/4G, expiration token, erreur 500, panne proxy, rotation de clé : aucune perte locale.
8. Tester avec PWA fermée puis réouverte ; délai de synchronisation conforme au **mode premier plan**, sans promesse de background.
9. Sauvegarder/restaurer SQLite à froid et à chaud ; aucune perte d'appareil appairé ou de données.
10. Vérifier TLS et CORS, autorisation multi-profil et politiques d'accès ; test de sécurité de base avant exposition.
11. Faire essai sur iPhone 15 Pro / iPhone 13 et sur plusieurs profils.
12. Activer pour données réelles seulement après validation des migrations et exports, conserver rollback.

## 11. Questions à Damien (non bloquantes pour prototype)

- Tous les appareils seront-ils dans le tailnet Tailscale, ou faut-il offrir l'accès aux proches sans Tailscale ? L'accès public via Funnel n'est **pas** autorisé par cette proposition seule.
- L'utilisateur souhaite-t-il une synchronisation limitée aux données structurées et résultats, ou également les **traces GPS détaillées** de toutes les sorties ? Enjeu taille de stockage et confidentialité.
- Faut-il prendre en charge la synchronisation multi-profils entre appareils de plusieurs personnes, ou seulement chaque personne entre ses propres appareils ? La séparation de profil reste obligatoire.
- Autorisation de dupliquer une copie privée de certaines données de santé sur le NAS ? En l'absence de réponse, ne synchroniser ces champs qu'après consentement explicite.
- QNAP : capacité RAM/disque disponible réelle, partition du volume dédié, stratégie sauvegardes ; ne pas inventer l'état des conteneurs.
- Déploiement public automatique souhaité pour l'app : ne pas étendre cette demande au NAS/à Funnel sans recette de sécurité.
