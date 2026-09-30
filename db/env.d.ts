declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    PROFILE_PHOTOS: R2Bucket;
    PUBLIC_SITE_URL?: string;
    PAYSUITE_API_TOKEN?: string;
    PAYSUITE_WEBHOOK_SECRET?: string;
    PAYSUITE_ENABLED?: string;
    RESEND_API_KEY?: string;
    PROFILE_EMAIL_FROM?: string;
    CF_SAAS_TOKEN?: string;
    CF_SAAS_ZONE_ID?: string;
    CF_SAAS_CNAME_TARGET?: string;
  }
}
