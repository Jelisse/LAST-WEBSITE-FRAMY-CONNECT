# Profile plans - approved 18 October 2026

This policy supersedes the September pricing and trial description.

| Plan | Price | Renewal |
| --- | --- | --- |
| Individual (`personal`) | Free permanently | None; no expiry |
| Professional (`professional-v2`) | Manager-published monthly/annual price | Confirmed payment for each period |
| Corporate (`corporate` or an existing versioned negotiated contract) | Manager-approved price and features | Confirmed payment for each enabled period |

The public 30-day trial is retired. New Individual terms provide eight links and a 200-character biography; managers retain established content controls. Physical NFC products, design and delivery are separate purchases. Corporate starts unpublished: a zero seed price is not a free Corporate offer. Its price must be configured before publishing checkout.

Migration `0030_permanent_individual.sql` archives former trial terms and dates, converts those memberships to Individual and provides Individual membership for active customer/agent accounts without one. Profile drafts, published content, receipts and paid contracts are preserved. Historical Individual payment snapshots remain stored, but Individual no longer expires or generates renewal requests. Former trial data remains readable for compatibility, not as a new offer.

Professional/Corporate renewals support enabled monthly or annual calendar periods. Verified provider evidence or the established manager-verified receipt flow activates access. Paid renewals before expiry retain scheduled future periods. No automatic recurring debit is enabled. After expiry and seven days of grace, public presentation uses Individual limits while excess content remains privately saved. Renewal reminders exclude Individual and former trials. Email service acceptance does not prove inbox delivery.

See `AMBASSADORS.md` for physical-product referrals. Ambassador codes never discount a subscription or generate subscription commission.

Deployed 19 October 2026 through the guarded `CLOUDFLARE.md` workflow after a private database backup. Migrations 0029/0030 and application version `794f454a-5caa-45da-808e-a7fceaf04435` are live. Real payment and email delivery checks remain external.


## Corporate organization configuration - 19 October 2026

Corporate organization tools are implemented locally; see CORPORATE.md. The canonical Corporate plan or a versioned paid contract with corporateEnabled=true and teams enabled qualifies the owner. memberLimit accepts 1-500 employees (default 25), excluding the owner and counting valid pending invitations. Prices and renewal periods remain manager-controlled; there is no automatic per-seat billing. Existing paid contract snapshots are preserved. Migration 0031 and deployment are still pending.

## Corporate approval flow - 19 October 2026 (local)

Corporate selection now opens company setup before payment. A Framy manager reviews the submitted request in Accounts and explicitly approves a 1-500 employee operational limit. This manual grant is independent of billing and remains until manager suspension; it never records a payment, changes prices or modifies paid plan snapshots. Existing paid Corporate eligibility still works without a manual override. Individual remains free while the request is pending. Migration 0032 is required. See CORPORATE.md.

## Corporate onboarding release - 19 October 2026

The guided setup, manual manager approval, authorization/password administration and email-only invitations are now published. Migration 0032 applied after private backup; Worker 83e67de9-cbed-4fa3-9abe-31812d6da5df, source d1bb074. This supersedes local-only/pending release statements above. Production public access and anonymous access protection verified on canonical/workers.dev domains; real email delivery and employee acceptance still require external confirmation. See ACCOUNT_HANDOFF.md for exact verification.

## Approved launch catalogue — 21 October 2026

The approved public names are Personal, Professional, Business and Enterprise. Personal uses existing permanent-free id personal; Professional retains professional-v2 and its manager-published MZN checkout. New display names do not rewrite membership terms_json, invoices, receipts or negotiated Corporate contracts.

USD reference prices: Personal free; Professional $4/month or $40/year; Business $2.50/employee/month or $25/employee/year for3–50 licensed employee profiles; Enterprise from $2/employee/month or $20/employee/year for51–500 profiles. Owner administration is included; an owner requiring a managed profile needs a paid seat. Physical NFC hardware, delivery and custom design remain separate. Applicable taxes and final terms are confirmed in checkout or quotation. No automatic debit.

lib/launch-offers.ts is the approved reference catalogue. Actual MZN prices remain manager-published; no historical FX rate is applied and no price records are overwritten. Home pricing and account plan selection share four comparison cards, audience groupings, Business recommendation, warm Enterprise gradient, monthly/annual control and employee estimator. Plan features shown for Professional respect managed feature controls. Existing custom contracts remain available through established subscription/renewal administration.

Business and Enterprise are quotation packages, not automatic per-seat checkout plans. Their company setup routes carry only a whitelisted offer through authentication. Requests persist offer, cycle, reference price and a server-recomputed integer-cent USD quotation in existing details_json. User-supplied totals are ignored; company approval enforces the selected tier's employee bounds. Legacy requests without offer retain existing1–500 capacity semantics. Approval continues to be an operational grant, not payment evidence. Professional employee access is scoped/provisioned through the agreed quotation and existing individual/negotiated contracts; no automatic corporate-to-personal entitlement inheritance was added.

CRM, Wallet passes, OCR/enrichment, SSO and automatic mail signature deployment are not advertised as included launch features. Company base setup and a named Enterprise contact are offered within the negotiated scope; specialised training/integrations require quotations. Real payment settlement and inbox delivery remain external verification.

Release21 October2026: approved four-plan catalogue and quote flow deployed as Worker31bac668-2604-402c-9362-e9a4cca471b5 after guarded schema/integrity checks and build.235 tests, TypeScript and targeted lint passed. No schema migration; existing paid snapshots and published MZN prices retained. See ACCOUNT_HANDOFF.md for scope and external verification boundaries.
