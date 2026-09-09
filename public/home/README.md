# Homepage hero assets

The hero uses independent elements in `components/home-hero-scene.tsx`:
- `iphone-side-shell.png`: generated black iPhone hardware mockup with a visible metallic right side rail.
- `profile-screen.jpg`: fixed browser capture of the current published Framy profile, captured 2026-09-09 at 390 × 848. No live account/profile request is made by the homepage.
- `nfc-card-blank.png`: independently generated blank orange card. The official `/brand/logo.svg`, NFC icon and exact tagline “O Seu Mundo num Toque.” are overlaid as separate print elements, keeping the branding accurate.
- `pedestal.png`: independently generated cream pedestal.

Generated with the built-in image-generation tool. Briefs: standalone transparent-background front-facing black iPhone 17 shell with blank screen; standalone front-facing orange Framy NFC card; standalone empty ivory circular pedestal. Warm studio lighting throughout.

The supplied `USER INTERFACE WEB Final.svg` guides the homepage typography, section ordering, product grid and audience layout. The hero reference supplies the cream-to-orange gradient and product arrangement.

Future motion can target `data-motion-layer="phone"`, `"card"`, or `"base"`, using their independent `--phone-motion`, `--card-motion`, and `--base-motion` transforms. Keep the screen inside the phone layer. No pointer/touch animation is enabled yet. When added, respect reduced-motion preferences and preserve vertical touch scrolling.
