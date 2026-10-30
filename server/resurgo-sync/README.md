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
- `POST /api/v1/pair/redeem` : échange un code temporaire contre un jeton d'appareil.
- `POST /api/v1/pair/start` : appareil autorisé génère un nouveau code temporaire pour appairer un autre appareil.
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

## Important : limites actuelles et sécurité non finalisée

- Ce dépôt ne contient **pas** encore de synchronisation cliente IndexedDB (outbox, merge, révision), ni d'administration graphique, ni de compte utilisateur autonome.
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
