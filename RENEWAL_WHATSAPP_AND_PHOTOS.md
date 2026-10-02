# Manual WhatsApp renewal reminders and product cutouts

Manager → Subscriptions → Renewal messages now lists upcoming and expired memberships. The saved email reminder lead time also sets the manual list window. Filters and search narrow the list. Prepaid future periods, inactive memberships and protected launch trials are excluded. The manager-only endpoint supplies the effective expiry and published business WhatsApp number. If missing, the manager may enter an international number for this conversation only; it is not saved to the profile.

The button opens official wa.me Click to Chat with the name, contracted plan, effective expiry and https://framyconnect.co.mz/perfil?plans=1. The manager must press Send in WhatsApp. Opening a conversation never creates a sent/delivered record. No WhatsApp API, external messaging service or database migration is needed. Existing manager endpoint pagination limits still apply: the screen explicitly warns when the first 500 memberships do not cover everyone.

Existing automatic email dispatch remains conditional on saved reminder settings and configured Resend credentials. Newly queued grace/basic notices also include the renewal link. Prepaid future periods no longer receive renewal reminders. Existing queued notices are not rewritten by this change.

## Photos

Built-in imagegen edited the three supplied images; originals remain unchanged. Final web assets:

- public/home/card-packaging-orange-cutout.webp
- public/home/card-packaging-black-cutout.webp
- public/home/kit-gift-box-cutout.webp

Transparency was checked from the alpha channel. WebP conversion retains alpha and caps width at 1000 pixels. The kit includes a generated reconstruction of originally cropped box edges; printed contact details and QR are illustrative product photography, not functional UI.

Final prompts used with built-in imagegen (transparent_background=true):

1. Edit target: supplied Framy Connect black gift box photograph. Remove entire grey background to genuine alpha transparency. Outpaint only missing cropped edges of open lid and front box so ENTIRE box is visible with 6% transparent margins, balanced square composition. Preserve original premium black box, foam, black leather keychain, card, camera perspective, exact FRAMY CONNECT branding and Angela Khossa name. Do not add products or change logo. Photorealistic product cutout, crisp natural details, no backdrop, no checkerboard, no floor.
2. Edit target supplied black Framy Connect packaging stack. Remove background completely to transparent alpha. Preserve identical stack, exact orange FRAMY CONNECT logo and text, orange visible insert, perspective, all edges and black texture. No changes to product, no additions. Full stack centered square frame with 5% transparent margins. Sharp premium photographic cutout, no floor or rectangular background.
3. Edit target supplied orange Framy Connect packaging stack. Remove background completely to transparent alpha. Preserve identical stack, exact white FRAMY CONNECT logo and text, orange visible insert, perspective, all edges and orange texture. No changes to product, no additions. Full stack centered square frame with 5% transparent margins. Sharp premium photographic cutout, no floor or rectangular background.

## Verification

142 automated tests passed, including international number validation, URL encoding, prepayment exclusion and email renewal links. TypeScript, lint and Cloudflare production build passed. Local fixtures verified overdue filtering, manual recipient entry, message preview, desktop product imagery and a 390px mobile layout. No real customer messages were sent. Deployment is separate.
