# ResurGo Sync — CANDIDAT de serveur NAS (non déployé)

**Statut : prototype non homologué pour données réelles de santé.**
Ce service est destiné au QNAP NAS-DAMIEN **uniquement après** tests d'intégration, de sécurité et de charge. Il ne remplace pas encore le Worker Cloudflare existant et n'est pas intégré à la PWA 1.3.4.

## Architecture validée par Damien

- Les utilisateurs finaux **n'ont pas Tailscale**. La synchronisation de leur PWA utilise un **HTTPS public par Tailscale Funnel** ; chaque requête de profil est authentifiée par jeton d'appareil.
- Damien seul (iMac ou autre poste autorisé sur le tailnet) accède à l'**administration privée** par Tailscale Serve.
- **Ne jamais partager le même port Tailscale** entre Funnel et Serve : Tailscale documente qu'un port partagé bascule entièrement public ou privé. Deux processus/écoutes distincts sont fournis ici.
- Le conteneur **public** n'a physiquement aucune route `/admin` ou `/admin/profiles` ; le conteneur **privé** héberge séparément l'administration.
- Les deux processus sont isolés d'AlphaTerminal, Forgejo, Home Assistant et des autres services existants. Seul leur **propre** dossier de stockage SQLite est partagé.

## Contenus

- `app.py` : 2 apps FastAPI séparées `public` (port interne 8080) et `admin` (port interne 8081), SQLite avec révisions, opérations idempotentes et appairage.
- `admin.html` / `admin.js` : interface d'administration **privée uniquement**, avec connexion par jeton, création de profils, codes d'appairage et révocation des appareils. L'API publique n'a aucune route ni aucun asset d'administration.
- `docker-compose.yml` : 2 conteneurs non-root, fichiers en lecture seule, `/data` persistant, ports uniquement sur loopback NAS.
- `requirements.txt`, `requirements-test.txt`, `tests/test_api.py`.
- `.env.example` : valeurs factices seulement, **ne pas** copier dans GitHub avec des secrets.

## Préparation en préproduction

1. Vérifier sur QNAP la charge CPU/RAM, les ports utilisés, l'URL HTTPS Funnel existante et les règles Tailscale ; **ne pas modifier les autres routes**.
2. Choisir un dossier de données persistant distinct : `RS_HOST_DATA_DIR=/share/.../Container/ResurGoSync/data` (chemin réel à vérifier) et permissions pour UID 10001.
3. Copier `.env.example` en `.env` hors Git. Générer **deux secrets indépendants** : `RS_ADMIN_TOKEN` et `RS_PAIR_PEPPER`, avec `python3 -c "import secrets;print(secrets.token_urlsafe(48))"`.
4. Depuis le NAS et **avant exposition**, vérifier `docker compose config`, `docker compose up -d --build`, puis le `GET /health` du service public sur `127.0.0.1:18879` et l'admin sur `127.0.0.1:18880` avec token administrateur.
5. Vérifier les routes d'administration **sur le service public : 404**. Tester deux appareils et deux profils fictifs, reprise après conflit, coupure NAS et révocation.
6. **Seulement après recette et évaluation de sécurité** : configurer **Funnel vers l'écoute publique uniquement**, et **Serve sur un port HTTPS différent vers l'écoute privée** ; l'accès privé doit requérir le tailnet ET le token admin.
7. Vérifier depuis un appareil **sans Tailscale** : sync autorisée avec jeton légitime ; administration impossible. Vérifier que CORS ne constitue pas un mécanisme d'authentification.
8. Activer progressivement la synchronisation réelle après création du `SyncClient` dans ResurGo. **Ce client n'est pas encore implémenté** dans la PWA.

## Contrat API prototype

### Administration privée uniquement
- `GET /health` avec token admin.
- `POST /admin/profiles` : crée un profil et retourne un code d'inscription temporaire.
- `GET /admin/profiles` : liste minimale des profils.
- `POST /admin/devices/{id}/revoke` : révoque un appareil.

### API publique authentifiée par appareil
- `GET /health` sans données personnelles.
- `POST /api/v1/pair/redeem` : échange un code temporaire contre un jeton d'appareil **et une clé de secours à usage de récupération**, indépendante du jeton.
- `POST /api/v1/pair/start` : appareil autorisé génère un nouveau code temporaire pour appairer un autre appareil.
- `POST /api/v1/recovery/redeem` : une sauvegarde chiffrée déverrouillée localement fournit `profileId`, `keyId` et le secret de récupération (aléatoire haute entropie), afin d'émettre **un nouveau jeton d'appareil** et **une nouvelle clé de secours**, sans administrateur ni ancien téléphone. Le mot de passe de sauvegarde **n'est jamais transmis**.
- `GET /api/v1/recovery/keys` et `POST /api/v1/recovery/keys/{keyId}/revoke` : gestion des identifiants de secours du seul profil autorisé. Révoquer une clé invalide les anciennes sauvegardes qui l'utilisent pour se connecter au NAS (la restauration locale reste possible).
- `GET /api/v1/devices`, `POST /api/v1/devices/{id}/revoke`.
- `POST /api/v1/sync/push` : lots d'opérations idempotentes et révisions attendues.
- `GET /api/v1/sync/pull?cursor=N&limit=M` : journal incrémental du seul profil autorisé.

**Format d'une modification :**

```json
{
  "operations": [{
    "operationId": "uuid-durable-de-operation",
    "entityType": "activity",
    "entityId": "activity-id-persistant",
    "expectedRevision": 0,
    "payload": {"durationSeconds": 1800, "distanceKm": 4},
    "deleted": false
  }]
}
```

Les réponses `applied`, `duplicate`, `conflict`, `invalid_entity_type`, `payload_too_large` sont distinctes. En cas de conflit, un client ne doit **jamais** écraser la valeur locale : demander une résolution cohérente avec la version courante.

## Sauvegarde chiffrée et restauration sans administrateur — branche candidate

La PWA sur cette branche possède désormais un module `app/backup-secure.js` et les réglages correspondants :

1. Dans **Réglages → Synchronisation NAS**, associer le premier appareil avec un code initial délivré lors de la création administrative du premier profil. **Ensuite**, tout appareil déjà associé peut générer lui-même un code temporaire de 10 min via `/api/v1/pair/start` : **plus besoin de l'administrateur** pour ajouter un téléphone.
2. Dans **Réglages → Sauvegarde chiffrée / restauration**, définir une **phrase de passe d'au moins 12 caractères**, la confirmer, puis **Exporter JSON chiffré**. Le fichier contient l'état complet du navigateur (`profiles`, `plans`, `activities`, `sessionRuns`, `metrics`, exercices personnalisés, réglages non secrets) avec chiffrement Web Crypto **AES-256-GCM + PBKDF2-HMAC-SHA256 (310 000 itérations, sel et IV aléatoires)**. Les jetons actifs de périphériques et tokens Worker ne sont pas dans le JSON. La clé de secours NAS peut y figurer mais **uniquement dans le contenu chiffré**.
3. Sur un nouvel appareil : ouvrir ResurGo, choisir **Restaurer JSON chiffré**, saisir le mot de passe du fichier. Déchiffrement et validation **sur le téléphone**, sans envoyer le mot de passe au NAS. Les données locales sont restaurées même hors ligne.
4. Si une clé de secours NAS figure dans le fichier et que le NAS est joignable, ResurGo appelle `/api/v1/recovery/redeem`, récupère un **nouveau jeton** et une **nouvelle clé de secours**. Générer ensuite une **nouvelle sauvegarde chiffrée** sur cet appareil. Si le NAS est indisponible, garder le jeu de données restauré localement et associer plus tard depuis un appareil autorisé.
5. Une restauration remplace explicitement le snapshot local après confirmation, **efface l'ancienne association NAS du terminal** et n'écrase pas silencieusement un profil NAS tiers. Prévoir un export de sauvegarde avant tout remplacement.

**Restrictions réelles :** les tests automatisés simulent le navigateur et l'API ; aucune recette Safari iOS réelle n'a encore été faite. Cette version candidate ne synchronise pas encore automatiquement les activités : l'interface d'association et la récupération NAS ne sont pas un moteur de fusion IndexedDB. Le mot de passe de fichier n'est pas un mot de passe de connexion NAS, et une sauvegarde sans secret NAS **ne réassocie pas automatiquement** le compte. La première création de profil NAS utilise encore la page d'administration privée : l'autocréation publique de profil (AlphaTerminal) reste à décider sous contrôle anti-abus.

### Vérification candidate
- `python -m pytest -q server/resurgo-sync/tests/` : tests d'API et récupération, y compris perte de l'ancien appareil, mauvaise clé, profils isolés.
- `node --test tests/resurgo-backup.test.mjs` : chiffrement/déchiffrement, mauvaise phrase de passe, fichier altéré, conservation de la clé de secours sans jeton de session.
- `node scripts/build-static.mjs --out .webapp-build && node --check .webapp-build/app.js` : intégrité syntaxique du bundle PWA.

## Important : limites actuelles et sécurité non finalisée

- Ce dépôt ne contient **pas** encore de synchronisation cliente IndexedDB (outbox, merge, révision), ni de compte utilisateur autonome ; l'administration graphique privée est présente mais doit être vérifiée depuis le poste Tailscale de Damien.
- Le **protocole API et son schéma sont candidats** ; tests unitaires nécessaires et migration à écrire avant exploitation.
- Le rate limiting du pairage est un garde-fou global minimal. Une exposition Internet exige une revue anti-abus, tests de charge, analyse d'entêtes proxys, une politique de quotas et une évaluation RGPD. Les codes d'appairage peuvent être récupérés via accès au profil déjà autorisé ; les jetons restent à protéger côté client.
- Une sauvegarde de SQLite en mode WAL nécessite un mécanisme de sauvegarde SQLite ou une copie à froid ; `cp fichier.sqlite3` en pleine écriture n'est pas suffisant.
- Les valeurs individuelles sensibles ne doivent pas être chargées dans un dépôt de code public. Avant synchronisation de données relatives à la santé, définir chiffrement de sauvegarde, consentements et politique de conservation.
- La connexion Funnel est **publique** et ne chiffre pas magiquement SQLite au repos ; la séparation de ports ne remplace pas l'authentification.
- Aucun compte Apple développeur n'a été déclaré disponible : cela limite les déploiements natifs watchOS/HealthKit, indépendamment du fonctionnement de cette API PWA.

## Références

- `docs/evolution-coach-multisport-2026/10_SYNCHRONISATION_NAS.md`
- `docs/evolution-coach-multisport-2026/11_ARBITRAGES_2026-10-30.md`
- AlphaTerminal `worker/README.md` et `worker/docker-compose.yml` comme **inspiration**, sans réutiliser ses secrets ou sa base.
- https://tailscale.com/docs/features/tailscale-funnel
- https://tailscale.com/docs/features/tailscale-serve

**Test local :** `python -m pip install -r requirements-test.txt && python -m pytest -q tests/`.
