# Product showcase and compact navigation

The homepage now cycles through both sides of the orange PVC, wood and black metal Angela Khossa card artwork, followed by the existing packaging images. It also shows both sides of each PVC keychain and two kit concepts. Existing catalogue prices and availability are unchanged.

## Generated white and orange kit

Output: `public/home/kit-white-orange-cutout.webp`.

References: `public/home/kit-gift-box-cutout.webp` and `public/products/cards/orange-back.webp`.

ImageGen prompt: Edit reference 1 into a second premium Framy Connect kit option. Preserve the camera angle, full open box composition, card left and round stitched leather keychain right with metal ring. Change exterior and inner lid to clean matte white, with Framy Connect orange #EE590D logo on the inside lid. White/light ivory fitted insert. Replace the black card with the orange Angela Khossa NFC card from reference 2, matching the name, NFC, typography/contact arrangement and white print. The keychain retains the round stitched leather shape but uses vivid #EE590D orange leather, a crisp white full Framy Connect logo and a silver ring. Realistic high-end lighting. Entire box, lid and ribbon visible with transparent padding on all edges. No background or floor, true alpha, no extra objects. Illustrative catalogue mockup, not a photograph of actual inventory.

Generated PNG: `C:/Users/NanaioAlberto/.codex/generated_images/01a0eadc-4be4-7d91-833c-735a7dd2e404/exec-00e6d5b0-34eb-48dc-96ab-47eeaaf85a61.png`.

The alpha-preserving WebP was trimmed and resized to 1000px high. The gallery identifies the new kit as an illustrative simulation; it is not a new orderable SKU.

## Navigation and copy

Shared panel headers use a 56px minimum height with 44px controls, allowing wrapping where needed. The agent greeting sits below its compact toolbar. The checkout's repeated brand eyebrow and “Choose another product” link were removed, along with redundant brand text in login, the plan picker and account heading. Explanatory, legal and transactional information is retained.

## Validation

- 144 automated tests passed; TypeScript and the Cloudflare production build passed.
- Local component preview with the compiled production CSS checked at desktop and 390px mobile width. Header measured approximately 57px including its border, with no horizontal page overflow.
- Checked the orange, wood and black card backs, the keychain back, the white kit and mobile navigation/language access. Gallery images loaded successfully.
- Screenshot: `tmp/showcase-desktop.png`. Preview uses fixture catalogue data; no deployment performed for this change.

## Customer tools and configuration update — 2026-10-03

Removed the leather preview angle slider and pointer tilt while retaining front/back viewing. The standard card design area now offers orange PVC, wood and black metal Angela Khossa artwork; selections share the existing material and pricing state.

Customer results now include 7/30/90-day filters, daily visits/clicks chart and table, action rankings, CSV export, explanatory guidance and empty/error states. Statistics continue to use the authenticated, consent-based profile engagement endpoint. The response includes its generation timestamp for consistent Maputo calendar dates. Clicks are not presented as sales or completed messages.

Professional tool cards explain their benefits and open existing editing/reporting functions. Team management has capacity counters, a short guide, search and invitation expiry information. Inbox status filtering is available. Existing permissions and membership limits remain enforced by the existing endpoints.

### Leather photo cutouts

All seven existing leather photographs were edited with ImageGen: black-back, black-blank, black-symbol, brown-back, brown-blank, brown-full and brown-symbol. Original PNG paths now contain transparent images; optimized `*-cutout.webp` assets are mapped through `lib/optimized-images.ts`.

Prompt for each original photograph: Remove ONLY the off-white background of this leather NFC keychain photograph, including the empty hole inside the metal ring. True transparent alpha. Preserve the exact leather color, embossed logo or NFC symbol (or blank surface if blank), stitches, metal ring, shape, front-facing angle and photographic details. No redesign, no new lettering, no shadow/floor. Preserve product position and scale relative to original canvas, full product uncropped, sharp clean edges.

Generated source paths are recorded in `tmp/leather-cutout-paths.json`. All seven outputs were visually inspected and their transparency verified. Original canvas dimensions are retained for existing custom-logo placement.

### Validation

144 automated tests passed. TypeScript and the Cloudflare production build passed. Browser checks covered card/material state synchronization, front/back controls without angle inputs, analytics periods/table/CSV, empty/error states, English translations, team search and a 390px mobile layout without horizontal overflow. The downloaded CSV was checked against the selected fixture period.

`tmp/customer-results-desktop.png` shows the local results component with explicitly labelled demonstration data. No customer invitations were sent and no production data was changed. This update is not deployed. Payment remains the next phase.

## Proportional mountain identity — 2026-10-03

The home call to action and footer now share one continuous landscape inside `home-brand-finale`. The original mountain is uniformly scaled and cropped, with a directional mask keeping text areas quieter. Shared orange headers use a smaller left-side crop that fades before the controls; full and compact footers use related restrained crops. Mobile crops have their own scale and position. Decorative layers ignore pointer events and are hidden in forced colours and print.

`public/brand/mountain-identity-2400.webp` is a proportional 2400px-wide optimized export of the original `profile-mountains.png`; no mountain geometry was redrawn or stretched. The higher-resolution asset avoids enlarging the old 1440px derivative. Dot intensity is controlled through opacity and masks rather than distortion.

Production build passed. Visual preview checked at desktop and 390px mobile width, with no horizontal overflow. Screenshot: `tmp/mountain-desktop.png`. This is a local composition preview using the shared CSS. Not deployed.
