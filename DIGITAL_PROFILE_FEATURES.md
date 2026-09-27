# Digital-profile plans and business tools

## Implemented

- Clear separation between the digital profile and physical products; customer-chosen link destinations.
- Optional WhatsApp enquiry link/message, hours and directions; five colours and two layouts.
- Consent-based profile visits/action analytics for 7, 30 and 90 days, including offer and enquiry actions. Clicks are not verified sales. Reports are owner-scoped and available during trial/launch/grace and the Professional plan.
- Monthly payment requests for Personal and Professional using managed catalogue prices. Each request stores the price, plan terms and approved payment instructions. A manager must verify an exact MZN amount and a unique settled provider transaction before activation. The keychain's fixed-price payment link is never used for subscriptions. Confirmation is atomic and retry-safe; receipts cannot be reused for physical products.
- Explicit one-calendar-month renewals, with month-end clamping. A same-plan renewal extends the paid expiry. A different plan starts after the already-paid period; only one future paid change can be pending. No automatic charging or renewal.
- Seven-day and one-day reminders, seven-day grace, then a minimal name/photo/one-contact public page. Draft content is retained. Customers choose visible links for smaller plans and their basic-page contact. Paid profile users can still buy physical products without restarting a trial.
- In-account reminder history and optional Resend email delivery with idempotency keys and bounded retries. Reading a reminder or confirming renewal suppresses its pending email; outdated reminder phases are never sent.
- Up to six product/service offers with title, description, informational price and external HTTPS link. This is a showcase, not a separate shopping cart.
- An opt-in enquiry form, owner inbox, read/closed status, deletion, submission rate limits and 90-day retention. A reply opens the owner's email application; messages are not auto-replied or emailed to the owner.
- Visitor-selectable Portuguese/English profile title, biography, hours and showcase offers. Customer-written English is optional; empty fields use the original. The app does not machine-translate customer content.
- Teams of up to 25 members/pending invitations. Invitations are shown inside the matching-email account and expire after seven days. Accepting explicitly grants visibility of the profile name/link/publication state and permission to apply brand colour. Members retain their own accounts and plans and may leave. This does not grant access to private contacts, enquiries, billing, passwords or account administration. Corporate billing remains by quotation.
- One custom domain per owner: TXT ownership proof, CNAME guidance, Cloudflare for SaaS provisioning, TLS readiness checks, removal and periodic revalidation. Only the assigned public profile and public assets/form endpoints are served; account cookies and authorization are removed and private routes are blocked. Domain serving requires Professional/trial access, publication, an active account, active TLS and a check within 24 hours.

## Launch policy

Monthly payments remain disabled by default. A manager opens them in **Subscrições digitais** only after entering approved payment instructions. Until then valid activated trial profiles keep launch access without charges. Opening or reopening paid enrolment grants expired launch trials at least seven days' notice before the seven-day grace period. Disabled accounts and unpublished profiles remain inaccessible.

The homepage reads this availability setting. Billing receipts are in the subscription section; the existing product-finance report remains a report of physical-product transactions.

## Required deployment steps

1. Apply both `drizzle/0014_profile_engagement.sql` and `drizzle/0015_profile_growth.sql` to the intended remote D1 database **before** deploying the updated worker. The local QA database has both. Migration discovery checks tables, columns, indexes, triggers and the effective-membership view.
2. Deploy the code and keep the existing 15-minute scheduled trigger enabled. It processes reminders, domain checks and retention cleanup outside visitor requests.
3. Enter the actual approved payment destination/instructions in the manager panel. Only then enable monthly subscriptions. No payment destination has been invented or enabled by this implementation.
4. For email reminders, configure `RESEND_API_KEY` as a Worker secret and `PROFILE_EMAIL_FROM` as a verified sender. Without them only in-account notices are delivered. The adapter uses the [Resend email API](https://resend.com/docs/api-reference/emails/send-email) and [idempotency keys](https://resend.com/changelog/idempotency-keys). Failed delivery retries within 23 hours; older notices remain in the account and are not replayed as stale emails.
5. For customer domains, configure Cloudflare for SaaS with a reachable fallback origin/Worker route and CNAME target. Set `CF_SAAS_ZONE_ID`, `CF_SAAS_CNAME_TARGET` and the least-privilege `CF_SAAS_TOKEN` Worker secret. The token needs custom-hostname management for the designated zone only. Customers add the generated TXT and instructed CNAME records. Follow the [Cloudflare setup documentation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/) and [hostname/TLS readiness requirements](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/common-api-calls/). No DNS or external Cloudflare account changes were made during implementation.

No live payment, external email or domain provisioning was performed during QA. Remote migrations and deployment must be verified separately; a Git push is not deployment confirmation.

## Verification

The automated suite covers payment role/amount/reference checks and duplicate retries, scheduled downgrade dates, calendar month boundaries, grace/basic projection, saved-content preservation, paid-customer physical checkout, owner-isolated enquiries, matching-email team acceptance/revocation, reminder deduplication, mocked DNS/TLS transitions and private-route blocking on custom domains. Provider calls in these tests are mocked; production credentials and external DNS still require an integration check after configuration.

Local browser checks verified English content, enquiry submission and inbox receipt/status, team creation, unavailable-provider guidance, manager launch controls and a 390px customer dashboard without horizontal overflow. The 91-test suite, TypeScript checking, targeted lint and Cloudflare production build passed.
