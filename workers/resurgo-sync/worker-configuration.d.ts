declare namespace Cloudflare {
  interface Env {
    RESURGO_SYNC_KV: KVNamespace;
    APP_ORIGIN: string;
    GARMIN_API_BASE_URL: string;
    GARMIN_AUTH_BASE_URL: string;
    APP_SHARED_SYNC_TOKEN?: string;
    GARMIN_CONSUMER_KEY?: string;
    GARMIN_CONSUMER_SECRET?: string;
  }
}
