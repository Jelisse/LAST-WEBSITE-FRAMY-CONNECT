# Product and checkout maintenance

Status: local implementation, 29 September 2026. Not deployed by this change.

## Implemented

- Removed the retired fixed-price payment URL. The payment API returns no payment URL for any order, including existing orders.
- New product orders are paused by default at the workspace API before order creation or stock reservation. Existing profiles, orders, tracking, and reconciliation of payments already made remain accessible.
- `/produtos` leads with Card, Complete Kit (recommended), and Keychain. The previous catalogue is retained as a reference.
- `/comprar` provides a single-page, non-transactional configuration preview: card/keychain/kit, material selections, three design services, PDF/editor alternatives, and one shared profile. Existing `/encomendar/:id` links redirect here during maintenance.
- Prices remain unconfirmed: no invented bundle discounts or material/service surcharges. Monthly plan prices come from managed plan records and are described as upcoming.
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
