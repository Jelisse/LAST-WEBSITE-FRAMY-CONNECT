# Cloudflare staging

Staging: https://framy-connect-staging.jelisselanga.workers.dev/

This deployment is separate from Sites hosting. A GitHub push or Sites publish does not itself update this Worker.

## Safe deployment

1. Sign in with `npx wrangler login` using the account that owns staging.
2. Inspect existing Worker bindings. Preserve the D1 database ID and configure its real photo bucket as `PROFILE_PHOTOS` in `wrangler.jsonc`. Never use placeholder or unrelated resources.
3. Run `npm run check:cloudflare-db`. This reads schema metadata only, never customer records. It compares remote schema with all migrations in `drizzle/` and refuses publication if a required table or column is missing.
4. If incomplete, inspect migration history and back up privately. Apply only missing migrations in order. Some deployments have manually applied migrations: never blindly reapply everything, reset the database, or seed test accounts remotely.
5. Run `npm run deploy:cloudflare`. It checks schema, builds with real staging bindings and deploys `dist/server/wrangler.json` with generated assets. Never deploy the source entrypoint or a previous Sites build to staging.
6. Verify the account menu, authenticated customer profile/orders, and `/api/product-options`. Verify TikTok, Instagram and Padrão artístico checkout using test data without making a real payment.

`npm run build:cloudflare` remains available for build-only use. Local preview uses separate resources.

## Customer data and stock failures

On 19 September 2026 staging options returned HTTP 503; anonymous workspace requests correctly returned HTTP 401. Cloudflare authentication was unavailable, so the remote schema and authenticated customer error remain unverified. Missing migration 0007 is one possible cause: it provides product_options and membership trial columns used by these screens. Check before applying it. Later security and application migrations are also required.

Purchase controls stay disabled when stock cannot be verified. The editor distinguishes a failed stock lookup from an unavailable model and offers a retry. Never substitute invented stock/customer records for a failing query.

## Prices and inventory

Products and plans display meticais. New plan edits store `meticais`. Legacy USD plans and historical terms convert for display at a fixed 1 USD = 63.91 MZN, the Banco de Moçambique reference dated 17 September 2026. Saved MT prices are never reconverted. Monthly seed prices: 63.91, 191.73, 319.55, 575.19 and 958.65 MT; the trial stays free. Managers edit commercial prices directly in MT.

Source: https://www.bancomoc.mz/en/areas-of-expertise/markets/foreign-exchange-market/

Physical launch inventory in Maputo, Mozambique is 175 Instagram, 175 TikTok and 150 Pattern keychains: 500 total. Migration 0011 records this breakdown once, subtracts outstanding reservations from option availability and disables unstocked blank keychains. The deployment check requires its audit marker. Aggregate reservation checks enforce the total limit. Later quantities and enablement remain under manager control; retries do not reset subsequent sales or manager changes.

## Access and payments

Registration creates customers only. Staff provisioning requires authorized management; accounts open their own permitted dashboard. Email verification and password recovery delivery are not configured.

The external Opsellio link applies to the 500 MT keychain order. Staff verify the provider transaction, currency, amount and unique reference before recording payment. Automatic webhook verification and paid monthly subscriptions remain unavailable.
