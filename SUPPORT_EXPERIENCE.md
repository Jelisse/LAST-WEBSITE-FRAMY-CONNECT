# Help and contact experience

## Destinations

- `/ajuda`: self-service answers and quick actions. Search matches translated article text, resets category on new input, expands matching answers and places results immediately below search. Fifteen answers cover profiles, NFC, purchases/payments, access, team invitations/templates and HubSpot/tools. Empty results offer a route to Contact Framy.
- `/contacto`: canonical Contact Framy page, replacing the generic static contact entry. Support, Sales and Partnerships reveal only relevant actions and details. Support uses info@; Sales uses sales@; Partnerships uses info@ with named co-founder representatives as secondary contacts. The approved public header/footer remain shared. Footer products/solutions email routes to Sales.
- Known dashboard paths: normal Help/Contact clicks open the shared support Sheet in place. It retains the dashboard route/state and omits public marketing chrome. Closing restores focus to the originating link or the role menu trigger. Modified clicks and new-window links retain normal navigation. Invitation acceptance and public profiles are excluded from interception.

## Contact behaviour

WhatsApp uses the established Mozambique company number. Optional message/reference fields construct an encoded mailto/WhatsApp link; nothing is submitted or sent on this website. Contact controls open the user's chosen external application. Order references are included only for Support, with bounded message lengths. No tokens, logged-in identity or private dashboard records are automatically inserted. Clipboard failures offer visible fallback guidance. No response-time, opening-hour or office-address claims were invented. The temporary Taiwan phone was not made public.

Founder contacts are the user-provided company email addresses and CTO/CEO roles. They appear under Partnerships rather than as first-line Help Centre support.

## Files and validation

New: `components/contact-framy.tsx`, `components/support-panel.tsx`, `lib/support-contact.ts`, `app/contacto/page.tsx`, `app/support-experience.css`, `tests/support-contact.test.mjs`. Updated shared sidebar, help component/content, public navigation/footer, root style/host imports and translations.

Contact-routing tests cover fixed recipients, encoded content, message limits, purpose-specific references and dashboard path exclusions. Browser checks used synthetic local account data only: desktop/mobile Contact Framy, sales destination, partnership representatives, copy feedback, HubSpot help search, dashboard state/focus restoration and mobile drawer-to-support transition. No email or WhatsApp message was sent. No ticket-submission backend is claimed. No deployment performed for this task.
