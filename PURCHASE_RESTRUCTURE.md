# Product and checkout maintenance

Status: local implementation, 29 September 2026. Not deployed by this change.

## Implemented

- Removed the retired fixed-price payment URL. The payment API returns no payment URL for any order, including existing orders.
- New product orders are paused by default at the workspace API before order creation or stock reservation. Existing profiles, orders, tracking, and reconciliation of payments already made remain accessible.
- `/produtos` leads with Card, Complete Kit (recommended), and Keychain. The previous catalogue is retained as a reference.
- `/comprar` provides a single-page, non-transactional configuration preview: card/keychain/kit, material selections, three design services, PDF/editor alternatives, and one shared profile. Existing `/encomendar/:id` links redirect here during maintenance.
- Hardware defaults: PVC card 950 MT, PVC/epoxy keychain 500 MT, and base kit 1,350 MT. The configurator reads manager-controlled catalogue prices. Wood, metal and leather remain unpriced in the configurator until explicitly confirmed. Monthly plan prices come from managed plan records and are described as upcoming.
- English and Traditional Chinese translations accompany the Portuguese interface.

## Replacement purchase flow

Configure products and design -> delivery/contact and payment -> account activation, profile setup and artwork completion. Existing customers reuse their profile. The kit has two physical order lines and one profile entitlement.

Before sales reopen:

1. Approve material availability, per-variant prices, design-service scope, bundle discounts, delivery and tax rules. Store amounts in integer MZN minor units.
2. Add validated server-side quotes and immutable multi-line order snapshots. Reserve both kit components atomically; reject stale quotes and release reservations on failure/expiry.
3. Connect the new configurator to order creation. Keep artwork and profile completion after payment; production still requires artwork approval. Preserve existing order records and their original totals.
4. Implement the chosen gateway's per-order checkout sessions, authenticated callbacks, exact currency/amount matching, idempotency, pending/failure states and refunds. Browser return pages must never confirm payment.
5. Introduce subscriptions only when billing is available: explicit consent, separate one-time/recurring amounts, start and renewal dates, cancellation and retry rules. One profile can have multiple devices.
6. Validate the full flow in an isolated environment, then deploy. `PRODUCT_CHECKOUT_ENABLED=true` is an explicit integration-testing switch for the legacy API, not a gateway implementation or a launch-ready checkout. Leave it absent in production during maintenance. Payment links remain disabled regardless of this switch.

The configuration preview does not collect files, submit orders, accept payment, or reserve stock. It does not yet persist selections across page reloads.

The existing API integration script `tests/checkout-api.mjs` exercises the legacy order flow only in an isolated environment with the order-creation switch enabled. Default maintenance behaviour is tested in `tests/launch-security.test.mjs`.


## Manager hardware pricing

In **Gestão de produtos**, edit each product's **Preço (MZN)** and **Preço confirmado para o configurador**. The PVC product also contains **Preço do kit PVC + porta-chaves epóxi (MZN)**, an independent base kit price. The default kit saves 100 MT. Savings are computed from current individual prices and are never displayed as negative.

For other material combinations, once their individual prices are confirmed and their product is published, the kit estimate equals the base kit plus each material's price difference from its base product. For example, replacing a 950 MT PVC card with a manager-priced 1,200 MT wood card adds 250 MT to the kit. This example is not a default wood selling price.

The leather keychain is a hidden, unpriced catalogue entry. Supply its correct photograph, price and availability before publishing. The existing metal seed amount is not considered confirmed and does not appear as an approved configurator price.

Price edits are versioned and audited by the existing manager API. They update future configuration estimates, not previously stored orders. Internal costs are excluded from the configuration payload. Confirming a price never enables checkout during maintenance. Custom-design service supplements and delivery remain separate and unpriced.

Individual and Professional new-plan defaults are 100 MT/month and 250 MT/month respectively. Existing manager overrides and membership snapshots are preserved. Annual prices remain a proposal and are not offered for payment.
