# Connecteurs Garmin / Apple / JSON

## V1

- `manual` : saisie locale.
- `json_import` : import de sauvegarde complète ou données normalisées.
- `mock_garmin` : données représentatives pour tester le flux.
- `garmin_cloudflare_proxy` : Worker Cloudflare + KV.

## Garmin

Le Worker évite CORS et garde les secrets hors frontend. La PWA configure :

- URL du Worker.
- Token applicatif personnel.

Le Worker configure :

- `APP_SHARED_SYNC_TOKEN`.
- `GARMIN_CONSUMER_KEY`.
- `GARMIN_CONSUMER_SECRET`.
- KV `RESURGO_SYNC_KV`.

Quand l’accès Garmin réel est disponible, ajouter dans le Worker les routes OAuth/callback, refresh token et récupération des endpoints Garmin Health/API. Ne jamais mettre le secret Garmin dans le bundle PWA.

## Apple Santé

Pas de HealthKit en PWA V1. Une app iOS native future pourra pousser des événements normalisés vers `POST /v1/apple/native-push`.

## Anti-doublon

Deux activités sont fusionnées si :

- même type ;
- début proche de 10 minutes ;
- durée proche de 15 % ;
- distance proche de 15 % quand disponible.

La source avec la meilleure priorité est conservée.
