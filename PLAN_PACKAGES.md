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
