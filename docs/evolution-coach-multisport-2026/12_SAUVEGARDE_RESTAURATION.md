# ResurGo Fitness — Sauvegarde JSON chiffrée, transfert et récupération sans administrateur

**Statut :** exigences validées par Damien le 30 octobre 2026 ; prototype développé dans la branche `feature/resurgo-sync-funnel-20261030` ; publication et recette appareils réels non effectuées.

## Exigences

- **BACK-001** Un utilisateur peut exporter **toute la configuration fonctionnelle et les données ResurGo présentes localement** sous la forme d'un JSON protégé par son propre mot de passe.
- **BACK-002** Le mot de passe reste exclusivement sur l'appareil, ne part pas vers le NAS ou Tailscale Funnel.
- **BACK-003** Un nouvel appareil restaure le JSON avec son mot de passe, y compris **hors ligne** ; aucune intervention de l'administrateur nécessaire pour reconstituer le contenu local.
- **BACK-004** Depuis un appareil déjà associé au NAS, un utilisateur génère un code de courte durée pour associer un autre appareil ; l'administrateur n'est pas sollicité.
- **BACK-005** Si le fichier contient une clé de récupération NAS protégée dans le JSON chiffré, un nouvel appareil peut aussi obtenir un **nouveau jeton d'accès NAS** sans administrateur, même après perte ou révocation de l'ancien appareil.
- **BACK-006** Un nouveau jeton de session et une nouvelle clé de récupération sont émis lors d'une récupération ; ne jamais recopier le jeton de l'ancien téléphone ni le mot de passe du fichier.
- **BACK-007** Les profils de plusieurs personnes sont isolés côté serveur ; données inconnues, modifications concurrentes et snapshots ne sont pas écrasés silencieusement.
- **BACK-008** Sauvegardes, appairage et restauration doivent fonctionner avec clients non-Tailscale via Funnel HTTPS. La console administrative reste hors Funnel (Serve privé distinct).

## État technique vérifié dans le prototype

### API Python / NAS

- `POST /api/v1/pair/start` : exige un appareil déjà authentifié, renvoie un code à usage unique valable dix minutes ; code aléatoire de 12 symboles, signature hachée en base NAS. `/api/v1/pair/redeem` associe le second appareil, crée un jeton indépendant et **une clé de secours propre au second appareil**.
- La base dispose d'une table `recovery_keys` ; seul le **SHA-256** de la clé de secours est conservé. Les clés de secours ont une haute entropie (48 octets aléatoires avant encodage URL-safe), sont indépendantes des jetons de connexion et peuvent être révoquées individuellement.
- `POST /api/v1/recovery/redeem` reçoit `profileId`, `keyId`, `secret`, `label` après déchiffrement local, vérifie la clé, retourne un nouveau `token` et une nouvelle paire `recovery`. Une mauvaise clé ou une autre identité de profil est refusée.
- `GET /api/v1/recovery/keys` et `POST /api/v1/recovery/keys/{keyId}/revoke` nécessitent l'authentification d'un appareil du même profil. Révoquer une clé invalide la capacité des anciennes sauvegardes concernées à réassocier au NAS, mais pas leur déchiffrement local.
- Rate-limit global minimal du rétablissement et de l'appairage en place ; protections supplémentaires de production indispensables pour un service accessible publiquement.

### PWA : `app/backup-secure.js`

- Chiffrement **AES-256-GCM** et dérivation **PBKDF2-HMAC-SHA256**, 310 000 itérations, sel aléatoire de 16 octets et IV aléatoire de 12 octets.
- Mot de passe minimum de 12 caractères, non stocké, non transmis au NAS, non intégré aux journaux.
- Format `resurgo-encrypted-backup` version 2 : `kdf`, `cipher`, `ciphertext` en Base64 ; aucune donnée personnelle en clair hors champs de format/KDF.
- Toutes les données stockées dans la clé d'état `app` IndexedDB sont exportées : profils, plans, activités, métriques, exercices surchargés, sessions, préférences. Certains fichiers médias/offline cache ou ressources statiques de l'app ne sont pas inclus ; ils restent distribués par le programme.
- **Secrets exclus** : jetons de sessions, tokens Worker et tokens spécifiques appareils. Une **clé de récupération NAS** (utilisable pour créer une nouvelle session) est incluse **dans la partie chiffrée** lorsqu'elle existe.
- Restauration : fichier limité à 25 Mo, vérification des paramètres cryptographiques, authentification du message par AES-GCM, validation du snapshot métier, confirmation avant remplacement. **Aucune écriture** si mot de passe incorrect ou fichier altéré.
- Nettoyage systématique de l'ancienne session NAS à la restauration : pas de sync vers le mauvais profil ; si clé NAS présente, réenrôlement sécurisé et stockage de la nouvelle session localement.
- Si NAS indisponible : restauration locale conservée ; l'association à distance reste à refaire.

### Interfaces

Dans **Réglages** de la branche candidate : formulaire mot de passe + confirmation, bouton **Exporter JSON chiffré** ; mot de passe et fichier à restaurer ; formulaire **Adresse API NAS HTTPS**, nom d'appareil et code, boutons d'association, de génération de code et de vérification.

## Différence importante avec AlphaTerminal

AlphaTerminal possède des mécanismes d'export chiffré et de récupération de connexion plus aboutis et intégrés dans sa synchronisation existante. ResurGo adopte le même principe, mais **son client de synchronisation automatique des entités n'est pas encore terminé**. Les mécanismes de sauvegarde/restauration ne signifient donc pas que les modifications du plan seront transférées automatiquement entre les deux iPhone.

La **création du premier profil NAS** utilise encore l'administration privée du prototype. L'utilisateur peut en revanche créer les codes des appareils supplémentaires et retrouver son compte depuis une sauvegarde chiffrée **sans** cet administrateur. Le flux d'inscription libre des nouveaux profils façon AlphaTerminal nécessite une conception anti-abus spécifique avant exposition publique via Funnel.

## Parcours normatif

### A. Premier appareil associé
1. Obtenir le code initial d'inscription du premier profil.
2. Renseigner l'adresse API Funnel HTTPS et le code dans les réglages PWA.
3. Le serveur transmet un jeton de session propre à l'appareil et une clé de récupération.
4. Choisir une phrase de passe forte et **exporter immédiatement une sauvegarde JSON chiffrée** ; conserver fichier et mot de passe séparément.

### B. Deuxième appareil sans administrateur
1. Depuis le premier appareil connecté, cliquer **Générer un code**.
2. Sur le deuxième iPhone, saisir l'URL du NAS, son nom et le code, puis associer. Le code est consommé et ne peut être réutilisé.
3. Le deuxième iPhone reçoit son propre jeton et une clé de récupération indépendante.
4. Si l'objectif est de restaurer ses données, transférer le fichier chiffré, choisir **Restaurer**, puis saisir le mot de passe. Ne pas confondre **association** et **synchronisation automatique** tant que le SyncClient n'est pas livré.

### C. Tous les appareils perdus
1. Ouvrir ResurGo sur un nouvel appareil.
2. Importer le JSON chiffré et saisir le mot de passe.
3. Les données reviennent localement, y compris sans connexion NAS.
4. Si le fichier contient la clé NAS et que le NAS est joignable, la PWA crée une nouvelle session NAS, sans code administrateur et sans ancien appareil.
5. Réexporter un fichier chiffré après restauration, car l'appareil dispose désormais d'une nouvelle clé de récupération.

## Sécurité et limites non négociables

- **Ne jamais publier un token, mot de passe, clé de récupération ou export personnel dans le dépôt GitHub, SichoBrain public ou les journaux CI.**
- Une phrase de passe courte malgré 12 caractères peut être devinable. Proposer une phrase longue et non réutilisée ; l'enveloppe utilise PBKDF2 comme sur AlphaTerminal.
- Perdre **à la fois** le mot de passe du fichier et l'accès aux appareils rend la sauvegarde chiffrée irrécupérable ; ne pas prétendre pouvoir la déchiffrer.
- Si la clé de récupération est révoquée ou absente du fichier, le mot de passe restaure toujours les **données locales**, mais ne donne **pas** automatiquement accès au compte NAS. L'utilisateur doit passer par un autre appareil déjà associé ou un mécanisme administratif exceptionnel.
- Ne pas exposer le serveur de démonstration sur Funnel avant l'audit de sécurité, les sauvegardes et les essais matériels.
- Les tests CI portent sur la cryptographie simulée sous Node WebCrypto, les endpoints FastAPI et la syntaxe JS construite ; **pas encore** une recette Safari iOS ni une synchronisation NAS réelle.

## Tests

- `server/resurgo-sync/tests/test_api.py` : codes d'inscription, restrictions de profil, récupération après révocation, mauvaise clé, révocation de secours, conflits et idempotence.
- `tests/resurgo-backup.test.mjs` : fichier chiffré, restauration locale, mauvais mot de passe, falsification, présence de la clé NAS et absence de jeton.
- `node scripts/build-static.mjs --out .webapp-build` et `node --check .webapp-build/app.js`.

Les résultats CI du 30/10/2026 : **12 tests API et 6 tests sauvegarde** réussis avec vérification du build JS, sur branche `feature/resurgo-sync-funnel-20261030`.
