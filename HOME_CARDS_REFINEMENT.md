# Homepage and card material presentation

Local implementation; deployment is a separate step.

- How it works uses MobileProfile with demoProfile, measurement disabled and inert embedded controls. The example-profile link remains the route to the interactive profile.
- Orange brand surfaces use #EE590D. Original mountain artwork is contained proportionally on home sections and footer, without enlarged cropped contours.
- Compact footer navigation has an explicit row layout at desktop widths and wraps on small screens.
- PVC orange and wood front/back previews are illustrative. Metal reuses the existing black front and Angela Khossa back. The selected material and side are shared with the configuration summary.
- Front/back rotation runs every six seconds, pauses on manual side selection, respects reduced-motion preferences and does not rotate in hidden tabs. A pause/resume control is available.
- QR overlays use the existing encoded example-profile QR, not generated decorative codes.

Generated project assets (built-in image_gen):
public/products/cards/orange-front.webp
public/products/cards/orange-back.webp
public/products/cards/wood-front.webp
public/products/cards/wood-back.webp

Reference images: public/home/angela-card.webp and public/home/solange-card-front.webp.
Prompt set: create a transparent sheet of two upright portrait NFC cards, front left with centered Framy F, back right retaining Angela Khossa and the reference contact/NFC layout. Straight-on orthographic view, rounded corners and entire cards visible. PVC variant: matte #EE590D with white print. Wood variant: light maple grain with dark brown engraved print. No extra labels or objects. Follow-up for each sheet: remove the backdrop outside both cards with actual transparent alpha, preserving printed details and arrangement, no outer shadow. The sheets were separated, trimmed and encoded to WebP at 960px height; no customer data was used.
