# Framy Connect — Build status

This folder is the first runnable development milestone, not a production launch.

## Mobile identity reference update

The editor preview and published identity route now share the portrait-led orange mobile layout from USER MOBILE-01.png. Photo upload accepts JPG/PNG/WebP up to 5 MB, persists in the PROFILE_PHOTOS R2 binding and saves its immutable reference and crop position with the profile. Draft photos are owner-only; published photos are served only while referenced by a publication. Profile saves verify photo ownership. Replaced uploads are retained so an existing published snapshot is not broken by editing a draft; storage cleanup is a future maintenance task.

The profile has social links, vCard download, a locally generated QR for its actual published URL, and native/copy sharing. The generated URL appears in the Operations preview, within the existing owner-isolated sandbox. It does not introduce production staff access to other users' profiles. Browser and functional testing of this update is deferred at the user's request.

Social SVG assets come from the Simple Icons project (https://github.com/simple-icons/simple-icons); the dotted geometric background is a code-native interpretation of the supplied reference. The person and text in the reference are not seeded into customer accounts.

## Customer plans update

The customer dashboard now focuses on identity, current plan, and links, with an Upgrade plan comparison and package detail flow. Five monthly price proposals correspond to the five audiences in WEBSITE.md. Preview plan selections persist in `sandbox_memberships`; links and biographies persist in profile drafts and publication snapshots. The API enforces capacity and rejects a downgrade that would exceed the target allowance in either snapshot. Concurrent profile/plan writes use version guards.

This remains a no-charge preview. There is no recurring billing, checkout, verified payment webhook, subscription renewal/cancellation or tax calculation. The sandbox membership table must never be treated as paid entitlement evidence. A production integration must grant entitlements from verified provider events. Institution/organisation prices are per profile and do not include team accounts, verified credentials or physical NFC products.

## Delivery scope

- SVG-derived public website and catalogue.
- Saved profile drafts and publication within the private preview.
- Owner-scoped sandbox order workflow and customer/agent/operations/CEO previews.
- Integer money calculations and guarded fulfilment transitions.

## Architecture decision

The private Sites preview uses the generated Vinext React/Next-compatible routing runtime, Cloudflare D1 and platform sign-in. This is a development delivery adapter, not implementation of the proposed PostgreSQL/Prisma and email/phone OTP production architecture. The original specifications are preserved in the parent folder. Customer public authentication, payment-provider integration, production staff permissions, tax configuration, accounting close and deployment to the company domains remain outstanding. Do not market the preview as production-ready.

All sample prices, sandbox orders and financial results are explicitly labelled demonstration data. There are no real charges or live fulfilment instructions. No privileged role is granted by choosing a dashboard preview. Every persisted record is scoped to the current preview user.

## Design provenance

Colours, Poppins family and logo paths come from ../USER INTERFACE WEB Final.svg. The master artwork remains unchanged. Body and action contrast adaptations use the same palette. The full SVG is not shipped to visitors.

## Review

Use the working private preview to review layout and flows. Before a public launch, complete the decision register in ../CEO_SPECS.md and implement the outstanding production capabilities.

## Verification result

The production build and TypeScript checks pass. Four domain tests pass. HTTP integration checks pass for unauthenticated/header-spoof rejection, cross-origin write rejection, order persistence and duplicate creation, full simulated fulfilment, stale-version rejection, profile privacy and unpublication, and ten main routes. No browser visual/interaction testing was requested or performed. The optional WebMCP sandbox-order tool is feature-detected but no supported validation context was available; it is not claimed as verified.

A runtime-only npm audit reported zero known vulnerabilities at this build. The initial all-dependency install reported development-tool advisories; review the full development dependency tree before a production launch. These results describe this first milestone, not security certification.

Application lint now passes. The unchanged starter component catalogue and its supplied mobile hook are excluded from application lint because the starter has pre-existing rule violations; they remain type-checked. No supplied component source was modified to hide those diagnostics.
