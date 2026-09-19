# Framy Connect launch review — 19 September 2026

**Verdict: not ready for public sales.** The public storefront has improved, but live stock lookup currently blocks checkout. A limited pilot should start only after this failure and the customer-account issue are cleared.

Reviewed site: https://framy-connect-staging.jelisselanga.workers.dev/

Scope: live anonymous browser inspection, public endpoint status/security headers, current source at commit 6115613, and existing test evidence. No account was created, no identity documents uploaded, no payment made, and no remote data changed. Cloudflare CLI remains unauthenticated, so remote schema, inventory, logs and authenticated workflows could not be inspected. This is a launch-readiness review, not a penetration test or legal certification.

## Confirmed live

- Homepage and catalogue load. NFC keychain is first, priced at 500 MZN.
- Other products show Brevemente without prices; their images have grayscale/saturation styling while the keychain retains full colour.
- The account menu on the product page opens with Entrar and Criar conta, not a role selector.
- Monthly plan prices display in MT: 63.91, 191.73, 319.55, 575.19 and 958.65; the trial displays zero.
- The agent application CTA appears on the homepage.
- The external Opsellio link opens a Framy Connect checkout for 500 MZN. It displays M-Pesa, eMola and credit/debit card options. Displayed methods are not proof that settlement works.
- Anonymous /api/workspace returns 401; /api/manager and /api/accounts return 403.
- HTTPS responses include HSTS and CSP. Those checks do not prove complete authorization coverage.

## Required before launch

| Priority | Finding and evidence | Acceptance criterion |
| --- | --- | --- |
| Blocker | /api/product-options returns HTTP 503. The live keychain checkout shows Stock indisponível and Stock por confirmar; TikTok, Instagram and Pattern controls are disabled. | Inspect D1 bindings, migration history and Worker logs; fix the actual exception. All three options must load and successfully submit orders, while preventing overselling. Do not invent fallback stock. |
| Blocker | The previously reported customer-data failure has not been cleared in an authenticated live test. Anonymous 401 is expected and does not validate account data loading. | Verify fresh and existing customer accounts: save/reload identity, view orders, log out/in, upload a photo, publish and unpublish. Confirm customer A cannot read customer B's private data. |
| Blocker | Confirmed physical inventory is in source migration 0011, but remote application cannot be verified while stock lookup fails. | Record 175 Instagram, 175 TikTok and 150 Pattern in Maputo; verify audit marker and aggregate 500 units. Available quantities must account for outstanding reservations. Disable placeholder blank-keychain stock. |
| Blocker for the commercial offer | Only the 30-day trial can be activated. Source entitlement rules stop public profiles after expiry; paid subscriptions/renewal are unavailable. | Define and implement how a buyer retains a working NFC profile after day 30. Publish accurate inclusion and renewal terms; do not advertise purchasable monthly plans before activation exists. |
| Operational acceptance | Payment link is reachable, but no live order-to-payment-to-delivery cycle was verified. Reconciliation is manual; there is no automatic provider webhook confirmation. | With an authorized test transaction, verify amount, currency, unique reference, staff confirmation, customer order status, assignment, NFC programming, dispatch, delivery and cancellation/refund handling. A staffed manual process can support a small pilot; a clickable link alone is insufficient. |
| Commercial readiness | Homepage still says plans are demonstrations in a preview. Terms ask buyers to contact staff for delivery cost/timing and cancellation/return conditions. | Publish the actual delivery coverage, charges/times, cancellation/return conditions, seller details and functioning support contacts. Remove development wording and make the 30-day offer consistent across pages. |
| Production readiness | Site remains on a staging workers.dev URL. Local metadataBase points at the separate Sites preview; metadata and robots block indexing. | Select the permanent domain and verify HTTPS, canonical/share URLs and indexing policy for public pages. Keep sensitive pages private. Verify the permanent NFC/QR destination before programming sale units. |

## Security and operations still to validate

Source contains password hashing, expiring hashed sessions, server-side role checks, customer/agent data restrictions, staff invitations and deactivation, upload access checks, reservation expiry and payment evidence validation. The latest local run passed 48 tests and TypeScript; the preceding storefront build passed. These results do not establish that the remote database and Worker are running a compatible version.

Email verification, automatic password recovery and staff MFA are not implemented. Confirm an effective account-recovery process and strengthen management access before scaling. Verify private BI/photo access with separate accounts, retention/deletion operations, backups and a restore drill, error monitoring and rollback. These are unverified operational controls, not evidence of a discovered live data breach.

Portuguese is predominant, but catalogue names such as Wooden Business Cards, Smart Event Badge and Digital Catalog remain in English. Homepage claims about proving/verifying identity should be aligned with the actual self-published profile functionality.

## Next sequence

1. Authenticate Cloudflare and diagnose the 503 from logs/schema, then apply only genuinely pending migrations.
2. Verify the exact Maputo inventory and customer account information on the deployed site.
3. Resolve the post-trial profile policy and complete a controlled purchase/payment/fulfilment test.
4. Finalize commercial copy, permanent domain, support, backup and security operations.
5. Run a small supervised pilot before opening unrestricted public sales.

No live database changes or deployment were performed during this review.
