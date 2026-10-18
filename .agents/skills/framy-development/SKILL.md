---
name: framy-development
description: Continue development of the Framy Connect application using its existing architecture, business rules, visual assets, and operational documentation.
---

Work in the Framy Connect checkout, identified by package.json name `framy-connect`. Paths below are relative to that checkout; do not assume a particular computer or account.

## Recover context efficiently

- Inspect Git status and preserve existing work. Read `ACCOUNT_HANDOFF.md` for the saved transition snapshot, then inspect current code for the requested change.
- Read `CONSOLIDATION.md` for the October 2026 consolidation. The app README and parent specifications include older milestone descriptions; verify claims against code and newer focused documents.
- Read only the relevant domain document: `CLOUDFLARE.md` for deployment/schema; `PAYSUITE_SETUP.md`, `PAYMENT_RETURN.md`, `PURCHASE_RESTRUCTURE.md`, or `docs/payment-diagnostics.md` for checkout; `CUSTOMER_ACCOUNT_RECOVERY.md` for recovery; `BRAND_AUTH_AND_LOCALES.md` and `LANGUAGES_PROFILE_HANDOFF_2026-09-19.md` for identity/locales; `PERSONALISATION.md`, `PLAN_PACKAGES.md`, or `SUBSCRIPTION-MANAGEMENT.md` for profiles/plans; `PRODUCT_MANAGEMENT.md` for catalogue operations.

## Project-specific constraints

- The implemented stack is React 19, TypeScript, Vinext/Vite, Tailwind 4, Drizzle and Cloudflare D1/Workers. Parent specifications describing PostgreSQL/Prisma/NextAuth are proposals, not proof of the current runtime.
- Preserve the existing Framy logo, Poppins typography, orange/warm-neutral palette, and established components. Parent `BRAND_GUIDE.md` and `USER INTERFACE WEB Final.svg` provide design references when present.
- Preserve Portuguese/localization conventions and Mozambique context. Commercial prices are manager-controlled in meticais; do not invent stock or overwrite prices with historical seed values.
- Customer records, profile drafts and staff operations require existing server-side access controls. Preserve published-field privacy and consent behavior.
- Payment confirmation must come from validated provider evidence. Monthly/yearly periods do not authorize automatic recurring debits. Read current payment code before assuming old maintenance notes still apply.
- Sites publishing and Cloudflare staging deployment are separate workflows. Do not assume a Git push updates a Worker. Preserve real bindings and existing database state; do not blindly replay migrations. Read `CLOUDFLARE.md` before deployment or schema operations.

## Complete a change

Use package.json as the command source. Node >=22.13 is required. Run relevant tests for the changed behavior; use `npm run typecheck`, `npm test`, and a suitable build when warranted. Local smoke tests require a local database/server and create test records; never point them at production. Do not claim remote services, email delivery or real payments were verified by unit tests.

When handing off again, update `ACCOUNT_HANDOFF.md` with the actual task, changed files, checks and unresolved dependencies. Keep credentials, customer records and raw private transcripts out of skills and handoffs.
