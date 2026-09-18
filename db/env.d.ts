declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    PROFILE_PHOTOS: R2Bucket;
    PUBLIC_SITE_URL?: string;
  }
}
