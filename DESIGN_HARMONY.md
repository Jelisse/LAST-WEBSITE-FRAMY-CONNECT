# Experience harmony — October 2026

Reference: the two user-supplied HiHello recordings (27 seconds and 117 seconds), the Resources menu screenshot, and the first-account/sidebar screenshots. Recordings show public navigation, grouped resources, restrained colour, feature storytelling and one visible topic at a time; they do not themselves demonstrate the authenticated onboarding editor. The Framy form refinements apply those principles to the existing application rather than asserting a frame-for-frame copy of an unseen flow.

## Shared chrome

PublicHeader now powers the existing SiteHeader entry point too. One consistent light header serves acquisition, catalogue and information pages; the focused variant keeps account, language and help for authentication/purchases. Solutions, Platform and Resources use concrete Framy destinations. Desktop dropdowns support click, outside dismissal, Escape and keyboard navigation; the mobile menu uses the same navigation data. No unsupported features or invented customer stories were added.

Keep the approved full branded footer on public pages, one quiet legal/support row on auth and purchase/tracking pages, and no automatic marketing footer in working dashboards. Standalone published profiles retain their original logo, mountain artwork and profile branding.

## Application sidebar and first visit

AppSidebarContents supplies the same brand/plan header, collapse action, scrollable labelled tool groups, active item, optional upgrade action and support/security area to customer, corporate, manager and agent workspaces. Existing role-specific item lists and all server access checks remain authoritative. The customer mobile drawer closes on selection, includes language selection and retains focus management. Compact account menus on internal headers show the signed-in account name/email and expose the same identity inside the menu on mobile. The no-store session response includes only the current signed-in account (null when anonymous).

New customers with profileVersion=0 and no published profile see a dedicated welcome with one primary Create my first profile action. Existing draft/published customers keep their existing/resume journeys. A direct /perfil link still opens the editor; purchase and company return destinations are preserved.

## Filling in information

Profile: a compact four-part guide, step-specific headings, identity/contact/appearance/review separation, advanced tools and languages collapsed, one biography input, compact expandable link rows, persistent unsaved state and explicit save/publish actions. Photo controls belong to appearance. Mobile preview starts collapsed and can be shown or expanded without leaving the draft.

Purchase: Product → Design → Delivery → Review and pay. Only the active configuration panel is shown. Prices/preview remain available; referral, breakdown, consent and Pay appear in the final review. Missing delivery details keep the customer on delivery with an actionable error. Returning to earlier steps preserves entered selections. Existing server pricing, stock, idempotency, provider validation and explicit payment consent remain unchanged. Maintenance mode is still enforced and its explanation is expandable.

Company request: Company → Team → NFC products → Review and send. Only relevant fields are displayed, draft saving stays available, previous steps can be revisited, optional products may be skipped, and final consent is explicit. Backend validation and manual company approval remain unchanged. The broader approval lifecycle is shown after submission rather than duplicating the wizard during entry.

Agent application: existing personal details/consent, private document upload and final submission contracts remain; each section is presented separately. No identity document or customer record was used for visual QA.

## Verification

Use the existing full automated suite, typecheck, targeted lint and fresh production build. Local browser acceptance uses an isolated QA D1 database and synthetic .invalid accounts only. No production account is created, no invitation sent, no payment submitted and no published customer profile edited for design verification. Screenshots are task artifacts, not repository customer records. See ACCOUNT_HANDOFF.md for actual results and deployment version.


## Role dashboard refinement — 23 October 2026

- Shared `AppSidebarDrawer` now supplies company, manager, payments, agent and director mobile navigation from the same `AppSidebarContents` element as desktop. It closes on selection, traps focus through the existing Sheet, provides an accessible title/description and retains the language/support controls. Customer mobile navigation keeps its existing Sheet and forces expanded labels.
- Desktop collapsed preference is stored as a non-personal layout setting (`framy-sidebar-collapsed`), synchronised on route remount and across mounted rails/tabs, with graceful handling of unavailable storage. Mobile drawers always show labels.
- Company template now uses EditorLivePreview's fitted device, with a compact company selector and no duplicate page banner while editing. The save action remains explicit and sticky; underlying branding/publication/privacy contracts are unchanged. Mobile preview precedes the form and remains collapsible/expandable.
- Manager and payments share manager section metadata; both include Payments and all manager destinations. Agent no longer switches to horizontal tabs on mobile; its heading tracks the chosen operational section while metrics remain visible.
- Director uses one selected section with mounted hidden panels so working form state survives navigation. Hash navigation restores on refresh/back; active sidebar state follows it. Removed duplicate embedded headings, preserving existing account/application/product components and role checks.
- Sticky action rows added only to long product/tool configuration forms. Operational tables, reconciliation and consent/financial workflows retain their existing controls.
- Validation: all 263 automated tests passed; TypeScript and targeted lint passed. Browser verification used only synthetic local company/customer/manager/director/agent accounts. Checked company rail persistence across routes, company template sizing, mobile company navigation, manager Finance selection, payments drawer, director selected-panel visibility/form retention, and agent Stock selection. Local fixtures and screenshots contain test data only. No real invitations/payments/customer changes or deployment in this refinement.
