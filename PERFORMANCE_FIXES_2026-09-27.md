# Purchase and page performance fixes

Implemented locally; production deployment is pending Cloudflare authentication.

- Catalogue reads no longer perform inventory writes. Migration 0012 retains the original one-time stock marker and adds indexes for stock reservations, customer pending orders, and expiry queries.
- Checkout and workspace load independent records concurrently. Repeated agent lookups in one workspace response are shared.
- Reservation expiry batches guarded updates, events and stock releases in one transaction instead of one network round trip per expired order.
- Completed public hero settings are cached for 30 seconds per worker instance. Uploads invalidate the local cache; other instances expire naturally. Customer data, prices and stock are not cached.
- Checkout reads and designer stock loading time out after 15 seconds instead of waiting indefinitely. Order/payment writes retain their existing behavior.
- Bundled PNGs have lossless WebP counterparts, used by the shared image component and homepage scenes. Original URLs remain available. The 23 converted files total 25,373,684 bytes versus 38,643,894 bytes (34% less); this is the entire asset set, not the payload of one page. Uploaded media is unchanged.

## Verification

- `npm test`: 65 passing tests, including 50 concurrent read-only catalogue calls, stock-query index plans, cache expiry, stock initialization preservation, and existing checkout/reservation safeguards.
- `npm run typecheck`: passed.
- `npm run build:cloudflare`: passed outside the Windows subprocess sandbox.
- All converted images preserve dimensions, alpha and rendered pixels on black and white backgrounds.
- Built-site smoke check: homepage, catalogue, keychain detail and purchase pages return HTTP 200. Twenty simultaneous local purchase-page requests succeeded (slowest 647 ms) and stock remained unchanged. This is a local smoke test, not a production capacity measurement.
- Local smoke test uses the installed runtime's supported compatibility date 2026-05-22. Production configuration remains 2026-09-10.
- Full lint reports existing issues in other code and the existing synchronous effect state setters in ProductDesigner. Targeted lint for the new cache test and image handling passes.

## Deployment

Cloudflare CLI reports that it is not authenticated. No live database or deployment was changed.

After signing in with `npx wrangler login`, inspect `node scripts/repair-cloudflare-db.mjs`. Expect migration 0012 for an otherwise current database. Apply the reviewed plan with `node scripts/repair-cloudflare-db.mjs --apply` (the script backs up first), then run `npm run deploy:cloudflare`. The deployment check now requires the indexes and original inventory marker before publishing.

Confirm that the existing worker serves the live domain before deployment, then verify the live purchase flow and review traffic/error metrics for the reported incident window. The original traffic-related outage remains unconfirmed without production telemetry.
