# Cloudflare staging

Build command: `npm run build:cloudflare`
Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`

The build explicitly selects `wrangler.jsonc`, checks that exactly one real D1 binding is present, and includes the generated client assets. Do not deploy the source entrypoint or only `dist/client`.

Local preview: `npm run dev`. It uses the local database, photo bucket and runtime compatibility date, independently of staging.

Account access:
- `/entrar` supports email/password registration and login. Registration only creates customers. Manager, agent and director roles must be provisioned by the operator. No separate finance role exists.
- Apply `drizzle/0006_account_access.sql` to the existing database before deploying this version: `npx wrangler d1 execute DB --remote --config wrangler.jsonc --file drizzle/0006_account_access.sql`.
- Run `node scripts/prepare-test-accounts.mjs` to generate private test credentials and idempotent provisioning SQL in ignored `outputs/`. Then apply `outputs/test-accounts.sql` with the same D1 command. Never commit these generated files.
- Passwords use bcrypt cost 12; session tokens are random, stored as SHA-256 hashes, expire in 24 hours and are sent in HttpOnly/SameSite cookies (Secure on HTTPS). Login attempts are limited by email and IP. No trusted request headers grant identity.
- Agent deactivation in Manager blocks further requests, including existing sessions. Finance is accessible only from Manager. Legacy finance links redirect there.
- Email verification and password recovery by email are not configured; `.example` test addresses are login identifiers, not mailboxes.
- Bind the actual photo bucket as `PROFILE_PHOTOS` and apply the reviewed D1 migrations. Do not use local placeholder resources in staging.
- `/exemplo` is a bundled demonstration profile; it does not require a customer record in D1.

Payments remain simulated. No real charges are enabled by deployment.
