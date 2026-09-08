# Framy Connect — development preview

A working first milestone built from the specifications in the parent folder and `USER INTERFACE WEB Final.svg`.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

1. Run `npm ci`.
2. On first setup only, apply the initial generated schema to an empty local database:
   `npm exec wrangler -- d1 execute DB --local --config wrangler.local.json --persist-to .wrangler/state --file drizzle/0000_tidy_hairball.sql`
3. Run `npm run dev` and open the local URL printed by the server.
4. Open `/dashboard`. Local sign-in uses the starter's development account. Deployed access uses the private Sites identity.

Do not apply the initial schema again to an existing database. Generate and review new migrations for future schema changes. Production migrations are packaged and applied by Sites.

## Implemented

- Responsive SVG-derived homepage, catalogue search/categories, ten product detail pages, company/help/contact pages.
- Original extracted logo, Poppins typography, orange and warm-neutral design tokens.
- Owner-scoped profile draft saving, reserved usernames, privacy controls, publication/unpublication and public projection.
- Contact VCF download and native/copy link sharing.
- Owner-scoped sandbox orders, simulated payment/refund, assignment, production, QC, delivery evidence and audit events.
- Customer, operations, agent, finance and CEO preview views. All operational views use the same owner's isolated sandbox data; view selection is not a role grant.
- Derived sandbox revenue/cost/advances, stage counts and CSV order export.
- API session checks, same-origin write checks, prepared SQL, optimistic version checks and duplicate-order protection.

## Validation

- `npm run typecheck`
- `npm test` — domain privacy, order guards and financial recognition.
- With a local server and local schema: `node tests/smoke.mjs` — access/CSRF, persistence, lifecycle, stale edits, public field visibility and route responses. This creates labelled test records in the local database only. It will not overwrite an existing profile.
- `npm run build`

See `BUILD_STATUS.md` for implementation boundaries and remaining production requirements. Production payments, email/phone authentication, stock, verified identity, accounting close, XLSX exports, QR generation and mobile apps are not implemented in this milestone.

## Architecture

This private preview uses the Sites-generated Vinext runtime and D1. The PostgreSQL/Prisma and public authentication architecture proposed in the original specifications has not been silently replaced: it remains a production implementation decision and migration task. No live domain or payment provider is configured.
