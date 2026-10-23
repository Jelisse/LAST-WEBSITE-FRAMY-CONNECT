# PaySuite checkout

Official contract: https://paysuite.tech/docs/ (reviewed 30 September 2026).
Payment methods: `mpesa`, `emola`, `credit_card` (Visa/Mastercard through the merchant's enabled card channel).
The API creates individual MZN payment requests. This integration does not initiate automatic recurring debits.

## Current scope

- Hardware, design and Maputo delivery are one payment. Product prices come from the published, confirmed manager catalogue; the final total is recalculated server-side.
- Proposed design fees per order: standard 0 MT, customer design 150 MT, team design 500 MT. City of Maputo delivery: 200 MT. These defaults start unpublished. Other destinations require a quote and cannot pay an incomplete total.
- The manager edits/publishes fees at `/manager/pagamentos`, linked from the manager dashboard. Hardware prices remain in the existing product manager.
- Customers need a published profile before ordering. Custom artwork is coordinated with the team after the order; upload/editor implementation is not part of this payment integration. The customer is told this before payment.
- Product orders use a separate PaySuite order ledger, visible in `/manager/pagamentos`. They are not added to the old sandbox order workflow. The manager must review the saved configuration, obtain artwork approval, arrange production/delivery and confirm delivery in this screen.
- Each kit reserves both catalogue items. Inventory deductions occur at reservation, not again at fulfilment. Verified failed payments release the reservation once. Pending/ambiguous requests retain stock until reconciled; there is no documented cancellation endpoint, so they must not be blindly expired and recreated.
- Subscription checkout offers one month or one year. It is blocked during the original 30-day trial. Customers authorize each renewal. Existing renewal notices and grace/access rules remain; existing memberships are never opted into automatic debit.
- Annual renewal prices are independently editable. Purchased prices and terms are snapshotted on invoices, and calendar periods handle short months/leap years.

## Secure activation

1. Replace the API credential previously disclosed in chat. Never put a token in a command argument, `.env` committed to Git, source code, URL or screenshot.
2. In PaySuite merchant settings, locate Webhooks. Register `https://framyconnect.co.mz/api/paysuite/webhook` and obtain the webhook signing secret. If the setting/secret is not available, ask PaySuite support to enable it. Do not substitute the API token for the signing secret.
3. Sign in to the Cloudflare account owning Worker `framy-connect-staging` and its main-site custom domain. Set two encrypted Worker secrets in its dashboard: `PAYSUITE_API_TOKEN` and `PAYSUITE_WEBHOOK_SECRET`. Alternatively run `wrangler secret put NAME --config wrangler.jsonc` and enter the value at the hidden prompt. Never use `--var` for tokens.
4. Back up the remote D1 database before applying additive migration `0017_paysuite.sql`. The repository's `repair-cloudflare-db.mjs` provides a read-only migration plan; `--apply` backs up before changes. Never reset or reseed customer data.
5. Build/deploy using the Cloudflare scripts, not the Sites build. The deployment script checks the remote schema before publishing. Keep `PAYSUITE_ENABLED` false until secrets, schema, custom-domain routing and merchant methods are ready. Set it to `"true"` in the Cloudflare deployment configuration for activation.
6. Confirm published product availability, prices and stock; then enable product payments in `/manager/pagamentos`. Separately enable profile billing through the existing subscription settings only when ready: that setting also controls the end of the current launch-access extension.
7. Verify PaySuite's actual production checkout URL uses the documented `https://paysuite.tech/checkout/` host/path. The integration refuses other domains. If PaySuite supplies a different verified checkout origin, update the explicit allowlist with a test; never allow arbitrary redirects.

The token is server-only. The webhook checks `X-Signature` against the exact raw request bytes using HMAC-SHA256, then fetches authoritative payment details from PaySuite. IDs, reference and amount must match our ledger. Payment requests are MZN per the provider contract; a response explicitly naming another currency is rejected.

## Failure handling and operations

### GitHub deployment without local browser login

Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions repository secrets. The token needs Account Settings Read, Workers Scripts Edit and D1 Edit for the site's account. PaySuite secrets stay on the Worker; do not copy them into GitHub.

The **Cloudflare website** workflow runs manually from `main`. Start with operation `check`: it runs tests, type checking, builds, checks the target database and encrypted Worker secret names, and reports pending migrations without modifying remote state. Secret presence does not prove the credentials are valid with PaySuite.

Operation `deploy` additionally records a D1 Time Travel recovery bookmark in the run summary, applies only compatible pending migrations and publishes the checked build. It refuses partial migrations. Recovery points expire after 7 days on Free or 30 days on Paid; no customer database export is uploaded to GitHub. Do not restore automatically after a failure because restoration can overwrite subsequent customer changes.

After the owner confirms secret replacement in PaySuite and Cloudflare, set `PAYSUITE_ENABLED=true`. Operation `activate` deploys the verified build and then enables product checkout and profile billing, preserving manager prices and existing terms. It records an audit entry and does not reset the billing-opening grace period when repeated. No charge is created by activation. Operation `deploy` preserves the database's existing billing switches. The workflow is not triggered by pushes or pull requests.

- A redirect does not mean paid. `/checkout/retorno` checks authenticated server state and offers the verified hosted checkout link.
- A repeated request ID returns the same session. An ambiguous provider timeout never triggers a second create POST. The manager can obtain the payment ID in PaySuite and reconcile it against the original reference and amount.
- Successful settlement is transactionally guarded. Repeated/out-of-order events do not duplicate stock deductions, receipts or access periods.
- Scheduled reconciliation polls known pending provider IDs every 15 minutes, alongside webhook processing and authenticated customer status checks.
- A success after a recorded failure is held for review; stock may already have been released. Do not ask the customer to pay again.
- Refund events create manager audit entries. Refunds are not initiated automatically, and delivered products/profile access are not automatically revoked by refund notifications. Review with the provider before adjustments.
- New PaySuite invoices must not be manually confirmed or cancelled through the old manual-payment UI. Use the PaySuite reconciliation screen.
- No raw provider payloads, signatures, secrets or customer payment credentials are logged. No real-money test was initiated during development.

## Verification

`tests/paysuite.test.mjs` runs the actual API routes against in-memory SQLite/D1-compatible storage and a simulated provider. It covers product creation, kit stock, hosted-session creation, signed callbacks, replay, ownership isolation, amount mismatch, failed release, late-success review, trial restrictions, annual/monthly access, timeout idempotency and redirect validation. It does not claim a live provider or browser payment was completed.

For the first real customer payment, monitor the provider transaction, our payment status, stock reservation and subscription period. If anything remains pending, reconcile it before attempting another payment. Do not use first-customer traffic as a substitute for the automated checks.

## Discount checkout correction - 19 October 2026

Shared client/server purchaseAmounts fixes the discounted subtotal before delivery selection and preserves the server-authoritative final amount. Automated actual-route test verifies a 500 MT keychain, 50 MT discount and 450.00 MZN PaySuite request with free pickup; original-base commission remains 75 MT at 15 percent. Product checkout was already enabled in the live database; both required PaySuite secret names were confirmed present without retrieving values. No billing flags, prices, subscription settings or secrets were changed. Pay stays conditional on known fulfilment, valid contact/artwork and explicit amount confirmation. No real-money transaction was performed.

## Discount correction deployed - 19 October 2026

The requested checkout correction is live as Worker 3b2ce6fa-f092-496e-843b-f8f2896a3280. Guarded deployment passed schema/relationship checks and rebuilt successfully; no migration or billing-setting/price writes required. Existing D1/R2, sender/canonical URL, PaySuite enabled flag and schedule preserved. Both canonical/workers.dev purchase pages returned200, public ambassador choices returned2 eligible entries with name/code fields only, listed-code validation passed, and configurator/ambassador bundle SHA-256 matched the final build. Real merchant payment/settlement was not performed. Browser visual verification remained partial due test-browser timeout. Source changes remain uncommitted/unpushed for this task; do not confuse the deployed build with the older Git HEAD.


## Guest physical checkout - local20 October2026

Physical purchases no longer require an auth account after migration0034. Names/emails and protected browser recovery live in dedicated guest tables; subscription authentication is unchanged. The same quote/reservation/settlement logic handles both buyer types. Homepage tracking is `/acompanhar`, with limited public progress and private email-capability/browser recovery. Manager and assigned agent update progress; no courier API is used. Read GUEST_CHECKOUT.md before migration/deployment. Migration0034 rebuilds two populated ledgers and restores all dependent triggers; use backups and the guarded process, never resets. Real email delivery/payment remain external checks. This section supersedes older documentation that required profile/account setup before physical payment.
