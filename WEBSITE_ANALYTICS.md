# Website analytics

Manager entry: `/manager?section=analytics` → Análise do website.

## Collection and meanings
- Public marketing/catalogue pages, sign-in, and checkout routes only. Private account/profile URLs and query strings are excluded. Public user profiles are not measured in this first version.
- Optional first-party collection after consent; decline is equally accessible. Preferences are in the footer. Do Not Track and Global Privacy Control suppress collection. Staff accounts and identified bots are excluded server-side.
- Random browser session identifier shared through local storage across tabs; expires after 30 minutes without visible-page activity. Only its hash is stored server-side. Concurrent first opens can produce an occasional extra session; never describe this as unique people.
- Online: sessions with a visible-page beacon in the last five minutes. Heartbeats every minute; background tabs pause. Up to five minutes of lag after a visitor leaves is expected.
- Page views deduplicate retry IDs; checkout steps deduplicate session/product/step. Reloads count as new page views. Source, device, coarse country and campaign belong to the session entry; domains only, no full referring URL.
- Funnel follows observed stages in order for each session/product started within the selected window. Reopened earlier journeys and blocked/unconsented events are excluded. Drop-off means no observed next step yet, not proof of permanent abandonment. Submitted is an observed browser confirmation, not proof of payment.
- Order count and current paid status are server totals for orders created during the selected period. They include customers without tracking consent and must not be divided by tracked traffic for conversion. This is not revenue or payment-date reporting.
- Dates use Africa/Maputo (UTC+2). Current days are partial. Prior-period comparison is withheld when collection/retention doesn't cover it. Peak heatmap values are totals, not weekday averages.
- Initial browser load and LCP averages are sampled after 15 seconds on visible pages. Short visits are underrepresented. Not final Core Web Vitals percentiles. INP, CLS, returning people, engagement duration and server HTTP errors are explicitly unavailable rather than invented.

## Performance and retention
Collection starts after hydration and is best-effort, bounded and asynchronous. All tracking failures are ignored by the customer UI. Manager reports poll every 30 seconds only while visible, never overlap, time out, preserve stale data with a warning, and abort on navigation. GET is authorised server-side and never cached publicly. CSV escapes formula-leading values.

Migration `0013_website_analytics.sql` adds sessions, events, indexes and the true collection-start timestamp. A 15-minute scheduled task removes up to 10,000 events and 10,000 orphaned sessions older than 90 days per run. Cleanup runs off the customer request path. Retention can lag if scheduled invocations fail or deletion backlog exceeds the batch size; monitor cron errors in Cloudflare. There are no changes to customer orders or inventory.

## Deployment
Apply pending compatible migrations before releasing. The existing `npm run deploy:cloudflare` schema guard includes the new migration automatically. `node scripts/repair-cloudflare-db.mjs` shows the plan; its `--apply` mode backs up the database before applying pending migrations. If GitHub triggers deployment directly, ensure that pipeline includes schema validation/migration and deploys the updated cron configuration. Never run local QA seed SQL against production.

## Verification
New endpoint tests cover permissions, consent, bots, private path exclusion, event deduplication, heartbeat counts, CSV safety, Maputo boundaries, aggregation, and sequential funnel isolation. Local UI QA uses disposable synthetic records in `.wrangler/performance-qa`, never production traffic. Actual reports start empty after deployment until opted-in visits occur. This work does not certify 200 concurrent shoppers.

Validation completed: 74 automated tests pass; targeted lint and production build pass. Desktop and 390px mobile manager views were inspected. Browser opt-in generated page events, and immediate checkout advancement recorded both stages 0 and 1 after the startup timing fix. Synthetic QA records and the disposable manager account were removed from the isolated local database. No production data or deployed code was changed.
