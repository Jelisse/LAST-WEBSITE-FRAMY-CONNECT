declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    PROFILE_PHOTOS: R2Bucket;
    PUBLIC_SITE_URL?: string;
    RESEND_API_KEY?: string;
    PROFILE_EMAIL_FROM?: string;
    CF_SAAS_TOKEN?: string;
    CF_SAAS_ZONE_ID?: string;
    CF_SAAS_CNAME_TARGET?: string;
  }
}
