# Portfolio name fonts

Allura (400) and Noto Serif TC (500), self-hosted WOFF2 subsets from Google Fonts. Both use the SIL Open Font License; each family includes its upstream `OFL.txt`.

- https://github.com/google/fonts/tree/main/ofl/allura
- https://github.com/google/fonts/tree/main/ofl/notoseriftc

`app/profile-name-fonts.css` retains the upstream Unicode ranges. Browsers download only subsets needed by the displayed name. These fonts apply only to profile names; the interface keeps Poppins. No font request to Google is needed at runtime.
