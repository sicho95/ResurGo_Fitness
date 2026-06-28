# ResurGo Sync Worker

Cloudflare Worker dedicated to ResurGo Fitness data connectors.

## Role

- Keep Garmin secrets outside the PWA.
- Store connector state in Cloudflare KV.
- Expose normalized endpoints for the offline-first PWA.
- Provide mock/import endpoints before real Garmin Health API approval.
- Leave Apple Health as a future native/iOS companion input; a Worker cannot read HealthKit directly.

## Endpoints

- `GET /health` health check.
- `GET /v1/connectors` connector capabilities.
- `GET /v1/garmin/status` reports whether Garmin secrets are configured.
- `POST /v1/garmin/mock-sync` stores deterministic Garmin-like metrics and activity for one profile.
- `POST /v1/import/json` stores normalized imported metrics/activities.
- `GET /v1/profiles/:profileId/events` returns stored normalized events.
- `POST /v1/apple/native-push` future endpoint for a native iOS companion to push HealthKit-derived events.

Private read/write endpoints always require `Authorization: Bearer <APP_SHARED_SYNC_TOKEN>`. If the secret is not configured, reads and writes are refused with `server_auth_not_configured`.

## Setup

```bash
cd workers/resurgo-sync
npm install
npm run types
```

Create KV:

```bash
npx wrangler kv namespace create RESURGO_SYNC_KV
```

Put the returned namespace id in `wrangler.jsonc`, then configure secrets:

```bash
npx wrangler secret put APP_SHARED_SYNC_TOKEN
npx wrangler secret put GARMIN_CONSUMER_KEY
npx wrangler secret put GARMIN_CONSUMER_SECRET
```

Deploy:

```bash
npm run deploy
```

## Garmin Real Connector Notes

Garmin Health API access requires Garmin approval and server-side credentials. This Worker is the right place to implement OAuth/signing and webhook ingestion once credentials and callback URLs are available. Do not put Garmin secrets in the PWA.
