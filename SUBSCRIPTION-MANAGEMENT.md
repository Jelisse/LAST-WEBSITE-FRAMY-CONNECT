# Subscription and finance management

Implementation scope: manager subscriptions, physical products separated, operational finance and CSV export. External software remains responsible for fiscal invoice issuance. No assumed ISPC rate, fiscal certification or automatic direct debit.

## Deployment

Apply additive migration `drizzle/0018_subscription_management.sql` before publishing this code. The Cloudflare workflow discovers it through the existing migration inventory and takes its normal recovery point. It creates management preferences, plan revisions, external invoice references, append-only finance adjustments, accounting-period locks and a fulfilment date for new gateway deliveries. No existing payments, profile contents or paid terms are deleted or rewritten. Old PaySuite deliveries without a recorded date are not backdated automatically.

## Plans

Subscriptions owns plans and their monthly/annual prices, billing availability, public ordering, link and bio limits, eight implemented feature permissions and additional commercial benefit text. Products owns physical stock, materials, catalogue and customisation. Plan creation starts unpublished. Archiving prevents new purchases; existing snapshots remain valid. A plan ID outside the original catalogue is accepted only with versioned contract terms. Historic legacy plan IDs remain excluded from new purchases.

Individual removes dedicated WhatsApp/messaging and location/hours for new terms. Existing unversioned paid terms retain their former permissions until renewal. A normal WhatsApp URL can still be one of the customer's links. Saved disabled content is preserved privately; public rendering and dedicated APIs enforce permissions. Editing benefits does not implement arbitrary software features; the identity/contact/sharing essentials and technical safety limits remain built in.

Every new plan edit stores a revision. Renewals paid before expiry are scheduled for the next period, including same-plan price or feature changes. Effective scheduled terms are promoted before scheduling a further renewal. One pending future renewal is permitted, preventing overlapping grants. Monthly and annual periods are independently selectable when enabled. Gateway confirmation remains authoritative for access activation.

## Renewal communications

Manager-editable subject, plain-text body and first-warning interval (2-30 days), plus last-day reminder. Variables: name, plan, period, expiry date and canonical renewal URL. Messages do not quote an unverified future price. Account notices and grace/basic notices remain available. Email reminders can be switched off independently. Deterministic notice IDs, send claims, provider idempotency and stale-phase suppression prevent duplicate or obsolete sends. The email log says 'accepted by email service', not 'delivered'; inbox delivery is inspected in Resend.

## Finance

The financial read model combines PaySuite product/subscription payments, non-gateway subscription receipts and legacy verified physical-order receipts without double-counting gateway invoices. Failed and pending payment requests do not count as receipts or automatically as customer debt. Filters use Maputo dates. Large queries fail explicitly above 10,000 records per source instead of silently truncating export totals. Subscription management currently displays at most 500 customers with an explicit truncation notice.

The dashboard shows confirmed receipts, gross recognized revenue, recorded settlements, fees, refunds and expenses. Annual/monthly service revenue is apportioned over actual contract dates with cumulative integer-cent rounding. Physical revenue uses delivery date. Graphs compare categories and receipt months. Operational double-entry journal and account-period totals export for mapping by the accountant. Gross recognition does not automatically classify revenue adjustments for returns or calculate taxes, and no net-profit claim is made where costs are incomplete.

Manual fees, settlements, expenses and already-executed refunds require a documentary reference, date, description and confirmation. They do not move money. Duplicate references and overallocated settlement balances are rejected in the same database write. Refunds after settlement can produce a negative reconciliation balance requiring review. Entries cannot be edited/deleted; exact reversals are new, dated records. Legacy refunds remain managed by their original workflow.

External invoice references are versioned and audited, not generated fiscal documents. Only one current external-document association is supported per operation; the external accounting system retains full invoice/credit-note chains and attachments. CSV exports include detailed operations, manual adjustments, journal and period summary; spreadsheet formula prefixes are escaped. CSV is Excel-compatible, not an XLSX workbook or tax-return file.

Period closing locks manual entries and document changes through a chosen completed month. Corrections must be recorded in the open period. Closing does not suppress automatic payment notifications and is not a statutory accounting close or a frozen audited financial statement. Refund classification, tax eligibility, official account codes and filing remain with the accountant.

## Verification

Automated coverage includes manager-only access, stale-write conflicts, custom plan checkout and permissions, historical entitlement preservation, annual-only billing, chained renewals, reminder variables, exact-cent recognition, balanced management journals, CSV injection defence, duplicate/excess settlements, immutable entries and period locking. UI was exercised locally with clearly fictional data at desktop and 390px mobile widths. No real payment, refund or customer reminder was sent during development.

## Product purchase and post-payment profile setup

Migration `0019_post_payment_profile.sql` must also run before deployment. Product checkout now requires an account and delivery details, but does not require a published profile. It retains server-side repricing, stock reservation, payment ownership and verified gateway confirmation. The return screen offers profile setup only for a verified paid product; subscription confirmations keep their own flow. A profile already published at checkout remains associated with the order. For a missing profile, database triggers attach the owner's first published profile to their paid, unlinked orders, including publication racing with payment confirmation. Existing production snapshots are never overwritten. A product without an associated profile cannot be marked delivered. Buying hardware neither starts another trial nor purchases a digital subscription.

The configurator now contains materials, design and delivery, with an explicit product → payment → profile journey and a separate price summary. `/perfil?pagamento=…` validates payment ownership and paid status before displaying the post-purchase instructions. No deployment or real payment was performed for this change. Automated checks cover checkout without a profile, pending versus confirmed payment, profile ownership, snapshot preservation and fulfilment gating; local fictional UI checks cover desktop and mobile layouts.

## Payment confirmation emails and approved product prices

Migration `0020_payment_receipts_and_prices.sql` sets the approved catalogue prices once (PVC 950 MT, PVC/epoxy keychain 500 MT, base kit 1,350 MT, wood 1,000 MT, metal 1,500 MT, leather keychain 1,200 MT). It does not change stock or availability. Manager catalogue edits remain authoritative afterwards. Other products in the supplied price sheet have not been mapped to ambiguous catalogue identifiers. Checkout continues to calculate hardware + selected design service + supported delivery, and validates the entire amount server-side.

Verified PaySuite product and subscription payments now atomically queue an email receipt. The snapshot contains the customer email, exact paid amount, order breakdown, provider reference and paid period where applicable. Payment reconciliation attempts immediate dispatch; the existing scheduled worker retries pending messages. Missing email configuration does not block payment confirmation. The existing RESEND_API_KEY and PROFILE_EMAIL_FROM settings are reused. No past payments are mass-emailed during migration.

A durable claim and Resend idempotency key prevent concurrent duplicate sends. Ambiguous failures are retried within 23 hours of the first attempt; afterwards the manager sees a review status, requiring provider verification before any manual resend. Resend retains idempotency keys for 24 hours: https://resend.com/docs/dashboard/emails/idempotency-keys. Accepted messages retain the provider message ID; this is not an inbox-delivery guarantee. The receipt explicitly does not replace the externally issued fiscal invoice. No real email or payment was sent during implementation tests.


Live deployment verification found that the existing PVC record was unpublished, so the approved card and kit prices were excluded from public estimates. Migration `0021_publish_base_products.sql` explicitly publishes the requested base catalogue entries, records the release and preserves stock/availability. It does not enable sales of unavailable inventory.
