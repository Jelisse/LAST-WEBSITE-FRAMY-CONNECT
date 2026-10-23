# Guest physical checkout and order tracking

Deployed on20 October2026 as Worker55a28261-59e1-4856-b9b0-f677d030b72c. Source remains uncommitted/unpushed; deployment was explicitly authorized.

## Buyer journey

1. Configure a physical card, keychain or kit. Availability, artwork, fulfilment and prices remain manager-controlled and server-validated. Ambassador discounts apply to hardware only; commission retains the original hardware base. Signing in is optional.
2. Enter buyer name/email plus the existing phone and pickup/delivery details. A 30-day HttpOnly, SameSite=Lax guest checkout cookie protects browser recovery; no auth account is created. Guest artwork uses a separate bounded asset ledger.
3. Confirm the displayed amount. An orange animated ring appears immediately while PaySuite is prepared; repeated clicks are disabled. Reduced-motion preferences are respected. A random reference is created before the provider request. The same request ID is recovered across retries/reloads, and ambiguous provider creation is never re-posted automatically. A422 validation rejection clears the provisional reference; a pending/uncertain different attempt directs the buyer to recovery.
4. The reference is shown in the checkout and included in a durable order email. This email explicitly does not confirm payment. Verified payment queues the existing payment receipt for the guest buyer. Neither a browser return nor a reference lookup can mark an order paid.
5. The homepage hero links to `/acompanhar`. A reference lookup shows only payment/progress labels and step times, without names, contact/address, amounts or payment URLs. The purchase browser, linked account or a 30-minute emailed capability can access private recovery/details. Access links go only to the stored purchase email, are rate-limited, stored as hashes and passed in URL fragments.
6. After verified payment, an optional account can claim the order only using an email capability and an authenticated matching email. Both ledger owners update together and existing paid published profiles can be attached. Subscription checkout still requires an authenticated eligible account.

## Framy operations

The PaySuite management page includes physical-order progress and agent assignment. The agent dashboard shows only assigned orders. Manager/assigned agent advance confirmed -> preparing -> ready for collection (pickup) or dispatched (delivery) -> delivered. Delivery has a confirmation control. Every change checks the saved version, verified paid state and assignment, and records an audit event. Unpaid/refunded orders cannot advance. Delivery updates the existing fulfilled state/timestamp used by finance; repeated clicks cannot deliver twice.

These progress controls do not encode NFC products, bypass existing artwork approval or confirm a financial transaction. Profile setup and authorized encoding remain separate tasks. No courier integration is used. Lists are bounded to the latest100 applicable orders; reference tracking searches the full ledger. Existing legacy order workflows remain intact.

## Storage and release

Migration `0034_guest_product_checkout.sql` is required before publishing this source. It makes product/payment owners nullable for guest physical orders and adds guest sessions/buyers, private access proofs, separate guest upload quota, reference-email outbox and progress/audit tables. It copies and reconstructs the four dependent child tables before replacing the two parent ledgers, then restores every child row, trigger and index. Exact-data guards compare the restored children with their transaction-local copies before those copies are removed. This avoids temporarily dangling foreign keys in remote D1. Populated transaction tests and isolated local D1 verify preservation, commit, foreign keys and receipt/ambassador triggers. Never reset or seed the remote database. Use the documented backup, migration inventory and guarded deployment workflow.

Guest upload quota is20MB/20 files per session, with IP rate limits. Expired abandoned artwork and access tokens are cleaned in bounded batches; order artwork is retained for fulfilment. Reference email uses a durable outbox with an atomic claim and provider idempotency; ambiguous attempts stop before the24-hour provider deduplication window. A sending acknowledgement is not proof of inbox delivery.

No real email, payment, customer mutation or remote migration was used for local validation. Resend delivery, PaySuite production settlement and the remote schema migration remain external verification. See ACCOUNT_HANDOFF.md for final checks.
