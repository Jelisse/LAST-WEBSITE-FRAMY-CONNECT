# Portfolio profile

The public profile and live editor preview use the same three-row layout: fixed cover/round portrait/name/language selector, a scrollable content region, and a fixed contact/QR/share/Framy/mountain footer. The bio opens from an About me item. Portraits have upload, replace, position and zoom only; cover photos have independent upload and vertical positioning. A missing cover uses the portrait as a soft background, or a brand gradient when both photos are absent.

Eight curated themes: Framy Orange, Black, Charcoal, White, Porcelain, Rose, Sage and Sand. Orange uses the existing #EE590D signature with a warm paper surface. Text, muted text and accent colours meet WCAG AA against each theme's paper. Historical custom colours and portrait settings still validate and remain in records, but the public portfolio uses only the curated themes and a circular portrait. Unsupported historical themes render as Framy Orange until the owner chooses another theme.

Names use self-hosted Allura for Latin glyphs and Noto Serif TC for Traditional Chinese. Both are SIL Open Font License fonts; public/fonts contains the licenses. Unicode ranges allow selective downloads. Remaining UI keeps Poppins. The portrait model/worker, build hooks and Transformers dependency are removed; product artwork tools are unaffected.

## Languages

The page opens in English and switches immediately between English, Portuguese, Traditional Chinese, Ukrainian, Polish, French and Simplified Chinese, including dialogs. An icon-only rounded-square button opens an accessible radio menu. Editor/home previews do not change the surrounding application's language. Customer names, destinations, contact details and the Framy logo stay unchanged.

`contentLanguage` identifies the original authored text. `translations` stores owner-supplied titles, bios, business address/hours, link labels keyed by destination and service text for each locale. The editor exposes all seven versions. Missing translations fall back to the original with a notice. There is no automatic translation provider, external content transmission, translation key or recurring translation cost. Existing English fields remain supported. Public presentation applies plan limits and removes unavailable translated content; basic fallback pages do not carry hidden translations.

## Storage and access

`coverUrl`, `coverPosition`, `contentLanguage` and `translations` are optional fields in existing profile JSON; no database migration or seed is required. Cover uploads reuse the existing private R2 photo endpoint, file validation and quota. Profile writes verify ownership of both images. Anonymous image access requires the asset to be referenced by the same owner's published profile with valid public access. Draft/unpublished covers remain private.

Profile requests support bounded UTF-8 payloads up to 256 KB to accommodate seven languages; other workspace actions retain their existing 64K text limit. Public enquiry error responses can follow the selected profile language without changing the visitor's account language cookie.

## Validation

Automated coverage includes translation fallback/identity preservation, privacy and plan limits, cover ownership and publication/unpublication, multilingual payload size, historical portrait compatibility and contrast for all eight themes. Browser checks cover English/Portuguese/Traditional Chinese/Ukrainian/Polish/French/Simplified Chinese, name fonts, bio and QR dialogs, long link lists, fixed header/footer geometry and narrow mobile viewports. No remote customer records or deployment are changed by this implementation.

## Anonymous profile clicks (18 October follow-up)

Profiles and `/exemplo` do not show the website analytics banner or preferences. The current profile hook sends explicit click targets only, without IDs, sessions or passive view events. It removes the former stored profile visitor ID. DNT/GPC and owner/staff/preview exclusions remain. The endpoint validates published destinations and stores daily Maputo totals in `profile_click_totals`, plus an anonymous accumulated count in `profile_click_lifetime`. An IP hash is used solely by the existing one-hour abuse limiter, outside analytics reports. Legacy consented requests/history remain supported for compatibility.

Migration `0028_profile_click_totals.sql` must be applied through the existing guarded deployment process before deploying this revision. It adds two counter tables and does not rewrite customer profiles or historical events. Daily counters expire after 90 days; the public lifetime total remains. Reports combine old consented history and new click totals; repeated clicks are not unique people. Owner statistics use calendar days in Maputo. Marketing website/product analytics retain their existing consent behavior.

Owner-authored text still requires owner-provided translations; no automatic translation service has been configured.

## Deployment status

Deployed on 18 October 2026 after a private database backup and guarded application of migration `0028_profile_click_totals.sql`. Full schema and relationship checks passed. Worker version: `00b86ec9-6800-4c8a-8c05-7fad6465fa53`. The canonical domain and Worker URL serve the new portfolio. Public-page, language-menu, stock endpoint and anonymous access-control checks passed. Real customer publication/uploads and email/payment delivery were not exercised during deployment verification.
