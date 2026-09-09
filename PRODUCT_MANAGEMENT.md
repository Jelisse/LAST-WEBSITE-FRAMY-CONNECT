# Product management

Open `/operations` using a catalogue-manager account. The product panel edits the twelve existing products, including the PVC and wooden cards. Save writes immediately to D1; the homepage, catalogue, details and new sandbox orders use the saved values. Existing order amounts and names remain historical snapshots. Uploads accept PNG/JPEG/WebP, maximum 8 MB, in the existing R2 binding under `products/`.

Prices and internal costs are stored in integer minor MZN units. Public responses exclude internal costs. Availability disabled means visible under consultation, without creating an order. New PVC/wood products keep consultation status until a price is set. Existing simulation/payment limitations are unchanged.

Migration `drizzle/0002_product_catalog.sql` adds `product_catalog` and `catalog_managers`. Managers must be explicitly inserted into `catalog_managers` using their trusted authenticated user ID. There is no first-user promotion, client-side role grant, or public manager-registration endpoint. The existing local `local_seedy` preview account has been granted access in the local database only. Production manager access must be configured by the operator before deployment; no production permissions were changed.

Updates use optimistic version checks (409 on stale writes). Mutation endpoints require authenticated manager membership and same-origin requests. Image uploads are bounded, use raster signatures, and do not accept SVG. Product IDs/icon types are not editable. Product image references are restricted to catalogue assets or the product-image endpoint.

Validation: `node --experimental-strip-types --test tests/products.test.mjs tests/domain.test.mjs`; `node tests/products-api.mjs` against the local development server. The API test edits and restores the metal product and uploads a test copy of its image, without creating orders or payments.
