# Product choices and personalisation

The checkout Product step contains only physical-product information. Keychains have three photographed choices (TikTok, Padrão artístico, Instagram) at 500 MT per unit and an optional custom front. Cards support artwork on both sides, with the saved profile name, email and final profile QR reserved on the back. The personalised PVC card is available at a suggested 950 MT per unit, including colour printing on both sides, personalisation and NFC/QR configuration. Other card materials retain their existing price and availability.

The custom keychain uses the same 500 MT unit price. Blank cards share one stock pool; blank keychains use a separate pool. The manager can change stock and manually enable or disable each option under **Gestão de produtos → Modelos e personalização**. Initial quantities are 500 per ready-made design and per blank type.

Orders reserve one unit atomically when created. Retries do not reserve extra units. Cancellation releases the unit. Payment opening alone does not mark an order paid. Pending orders retain their reservation until cancelled or fulfilled; there is no automatic reservation timeout.

PNG/JPG/PDF files are previewed locally before sign-in and stored privately in R2 when the order is confirmed. The manager can download the original files and see placement settings and 2D/3D previews in the order detail. Card identity fields are derived on the server, not accepted from the uploaded design. The flat SVG export uses physical dimensions of 28 mm or 85.5 × 54 mm with an embedded raster at approximately 300 ppi. It has no bleed, CMYK conversion or printer-specific die line; those production specifications remain to be supplied.

Only **30 dias grátis** can be selected or activated. It currently includes 15 links and a 400-character biography. Its 30-day period starts at activation, cannot be restarted, and has no automatic renewal. Expired trial profiles stop being public, while their saved data remains. Other plans remain visible with disabled selection controls.

The keychain payment button opens the supplied fixed checkout URL after order creation. No provider webhook, automatic reconciliation or payment-status inference was added. Card checkout does not use that fixed-price keychain payment link.

## Deployment

1. Back up the target database and apply `drizzle/0007_product_personalisation.sql` and `drizzle/0008_printed_pvc_price.sql` once before deploying the new app. The migration creates `product_options`, transactional stock-reservation support, and trial timestamps, and updates any persisted keychain price to 500 MT. It has been applied to the local preview database only.
2. Ensure the deployment has the existing `DB` binding and an R2 bucket bound as `PROFILE_PHOTOS`. The local preview supplies both; the checked-in staging `wrangler.jsonc` currently declares only DB, so uploads need the R2 binding configured for that deployment.
3. Ship `public/pdf.worker.min.mjs` alongside the application. It must match the installed `pdfjs-dist` version. When upgrading PDF.js, copy its `build/pdf.worker.min.mjs` into `public` again.
4. Build and deploy using the project's chosen hosting workflow. No remote database or deployment was changed by this implementation.

## Checks

`npm run typecheck`

`node --experimental-strip-types --test --test-isolation=none tests/customisation.test.mjs tests/domain.test.mjs tests/products.test.mjs`

`python tests/stock-reservations.py`

Local API verification also covered free-plan-only activation, publication, ready-made and custom orders, PDF uploads, authoritative card identity/QR data, private downloads, zero stock, manager permissions, and stale stock-edit rejection.

## PVC pricing assumption

950 MT is a proposed retail price, not a printer quotation. Confirm material, two-sided printing, handling and reprint costs before accepting paid production. Shipping remains separate. Regional reference: [Tappa custom PVC card](https://tappasa.co.za/products/pvc-business-card) lists branding and both-side customisation; its South African price is not a Mozambican print-cost estimate.

The Forest, Violet and Framy styles are inspired by the supplied card reference. A plain style remains available for complete customer artwork. The same SVG composition powers the 2D view, 3D surface and physical-size print export; approved orders retain the selected style.
