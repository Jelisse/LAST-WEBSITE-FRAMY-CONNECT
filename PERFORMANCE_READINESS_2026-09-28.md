# Performance improvements and local shopping tests

## Implemented

- Generated fingerprinted WebP derivatives at 320, 640, 960 and 1440 pixels (never enlarged beyond the source). `SourceImage`, homepage hero artwork and sharing illustrations now advertise responsive sizes. Uploaded/private/blob images keep their existing URLs and access rules.
- Kept lower-page images lazy, with explicit dimensions. Above-the-fold hero artwork loads eagerly without giving every image high priority.
- The transparent keychain image is 768,739 bytes at source versus 40,932 bytes for its 640-pixel derivative. The browser can select larger derivatives for larger/high-density displays.
- Replaced the 4,655,240-byte decorative PNG used by homepage, sign-in and shared backgrounds with a 321,790-byte 1440-pixel WebP. This is about 93% smaller for that asset.
- The 640-pixel fallback collection totals 1,162,092 bytes versus 39,668,393 bytes of source assets. This is a comparison of the asset collection, **not** a measured reduction in every page's download or load time. All derivative sizes together take more space than the fallback collection.
- Added one-year immutable browser caching only for the new content-fingerprinted `/media-optimized/*` files. A local HTTP check verified the header is served. Account and checkout API responses remain `no-store`; prices, inventory and user data are not cached by this change.
- Video sources are attached when the scene is visible. Playback pauses off-screen or in a hidden tab. Reduced-motion and data-saving preferences suppress automatic loading/playback; the play button remains available.
- Reservation cleanup runs from the existing 15-minute scheduled handler. Read requests retain a fallback, coalesced and throttled to once per 30 seconds per database binding per isolate. A failed cleanup can retry immediately. Checkout and staff mutations still request fresh cleanup, and the existing transactional stock/version guards remain intact. Inventory itself is never cached. Separate isolates may each run a scan; SQL guards prevent double release.
- Added `Server-Timing: app` for response creation time, plus structured warnings for slow responses (1.5 seconds or more) and HTTP 5xx responses. Logs contain a small route category, method, status and duration, without customer URLs, query strings, cookies or identifiers. This measures response creation, not full streaming/download time; existing Cloudflare invocation logs cover unhandled exceptions.

## Validation

- 78 automated tests passed, including concurrent cleanup coalescing, immediate retry after database failure, forced checkout cleanup, cache privacy, fingerprinted asset integrity and existing checkout/security tests.
- TypeScript and targeted lint checks passed.
- Desktop and 390-pixel mobile browser checks showed responsive artwork with no horizontal overflow. Scrolling away paused the video.
- The Cloudflare production build passed before load testing; the final background-only update was rebuilt afterward.

## Local load-test results

`tests/load-shopping.mjs` creates a new disposable local database, applies all migrations, seeds synthetic customers and stock, and starts a local Worker on a dynamically selected port. It cannot target a remote website. No real accounts, orders, payments or production data are used. Each shopper browses three pages, signs in, reads their workspace, places an order and repeats the same submission twice concurrently.

| Scenario | Result |
| --- | --- |
| 20 simultaneous shopping journeys | All 160 HTTP requests succeeded in each of two runs |
| Duplicate submissions | 60 submission requests produced exactly 20 orders, 20 creation events and 20 stock deductions |
| 50 simultaneous shoppers | Local Wrangler exited in both runs during the homepage burst; HTTP 500 and connection failures occurred |
| 100 and 200 shoppers | Not run: the harness stops escalation after a failing stage |
| 20 shoppers competing for the last design option | Exactly 1 success, 19 HTTP 409 responses |
| 20 shoppers competing for the last physical unit | Exactly 1 success, 19 HTTP 409 responses |
| Stock/payment integrity after the separate race tests | Exactly 2 orders and 2 creation events; no overselling; no payments recorded |

Second shopping run, with route modules warmed and the separate visual preview stopped:

| Request | p50 | p95 |
| --- | ---: | ---: |
| Homepage | 666 ms | 3,556 ms |
| Product catalogue | 832 ms | 2,750 ms |
| Checkout page | 2,302 ms | 2,979 ms |
| Sign-in | 2,743 ms | 5,882 ms |
| Workspace read | 2,750 ms | 5,382 ms |
| Order submissions, including retries | 1,228 ms | 5,634 ms |

These are local HTTP response completion times, not browser-rendering metrics or Cloudflare edge timings. They do not establish production capacity or instant loading. The local runtime used compatibility date `2026-05-22`, matching the installed local workerd; the production configuration remains unchanged. The runtime error did not include a usable diagnostic message, so its cause is unresolved and must not be attributed to either application code or infrastructure without further evidence.

Local evidence, deliberately ignored by Git:

- `tmp/performance/load-126ee6c9-d879-419d-a288-0b6ff739de7a/report.json` — first attempt.
- `tmp/performance/load-eb618077-64a0-4421-b18d-ad7addbac1c2/report.json` — second attempt.
- `tmp/performance/readiness-verify.json` — database verification of duplicate submissions.
- `tmp/performance/load-48d65089-0b8e-47f7-8b33-37ec1e7d958a/report.json` — successful independent last-item races.

## Reproduce locally

```sh
npm run images:responsive
npm test
npm run typecheck
npm run build:cloudflare
npm run test:load
# Run stock-integrity races independently of the capacity ramp:
npm run test:load -- --integrity-only
```

Image generation is a deliberate build-time maintenance command, not part of customer requests or every deployment. Generated files and their manifest must be committed together. Run local load tests without other development servers or builds competing for machine resources. The harness keeps its disposable state and reports under a unique `tmp/performance/load-*` directory and stops the server it started.

## Remaining before a 200-shopper capacity claim

1. Confirm the deployment and earlier database migrations on the actual Cloudflare environment. This change adds no migration; analytics migration `0013_website_analytics.sql` still needs independent remote confirmation.
2. Investigate the repeatable local 50-request runtime exit. Use an isolated Cloudflare staging deployment with separate D1/R2 resources to distinguish local development-runtime limitations from application bottlenecks, then run a controlled 20 → 50 → 100 → 200 workload there. The local-only harness must not be pointed at production.
3. Include mobile/browser timings, real network latency, cache-warm/cold runs, account creation and payment-provider sandbox callbacks in staging. This local test exercises existing-account sign-in and order creation, not real payment settlement.
4. Review the existing shared-network abuse policy: sign-in/account discovery allows 50 attempts per IP per 15 minutes; checkout allows 20 new attempts per IP per hour. Many legitimate shoppers behind one Wi-Fi/mobile gateway can reach those limits. The tests use separate synthetic client IPs; security limits were not raised or disabled.
5. After deployment, inspect Cloudflare response errors and slow-request warnings together with consent-based site analytics during the previously busy hour. Do not promise 200 concurrent shoppers until the staging run passes with acceptable latency and correct inventory/payment behavior.

References: [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
