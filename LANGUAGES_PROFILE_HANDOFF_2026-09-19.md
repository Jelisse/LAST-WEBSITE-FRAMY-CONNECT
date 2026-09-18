# Languages and profile handoff

## Behavior

- Managers receive the approved profile URL captured by each order. Assigned agents receive the same URL after payment verification; existing role and assignment checks remain in force.
- Customer profile panels offer preview without a copy button or selectable URL field. Public URLs remain public and can still be copied using browser functions.
- The homepage main header contains the agent application link and language selector, including on mobile.
- Portuguese is the default. English and Traditional Chinese are selected through a validated, persistent `framy-language` cookie. Server rendering, document language, navigation, forms, dashboards and system notices use the selected locale.
- Amounts remain in meticais. Customer-authored names, biographies and custom content remain in the language entered. New manager-authored catalogue text is not automatically machine-translated.
- Names written entirely in Chinese receive a valid ASCII profile URL; the server allocates unique suffixes without changing the person's name.

## Verification

- 59 automated tests passed, including manager/assigned-agent URL consistency and customer preview-only rendering in all three languages.
- Local HTTP checkout regression passed authentication, private payload checks, atomic stock reservation, payment evidence, staff invitation, production, dispatch, delivery and session revocation.
- `node tests/i18n-http.mjs` passed three-language page rendering, header placement, invalid-locale fallback, authenticated customer rendering and unique Chinese-name profile URLs against the isolated local QA server.
- Browser checks covered Portuguese, English and Traditional Chinese homepage navigation, the English application form, and mobile layouts at 390px.
- TypeScript and the Cloudflare production build passed.

## Deployment boundary

These checks use local fixtures, not live customer accounts or real payments. A Git push does not confirm deployment or repair the live database. The previously identified live stock API failure, remote inventory migration and authenticated live purchase checks still require Cloudflare access and deployment verification. No live database repair or payment was performed as part of this change.
