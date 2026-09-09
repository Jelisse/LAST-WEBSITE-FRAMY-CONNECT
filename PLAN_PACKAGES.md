# Proposed Framy monthly packages

Monthly billing requested by the user. Prices are USD per digital profile per month, proposed for review rather than live commercial offers.

| Audience / plan | Monthly price | Link boxes | Biography |
| --- | ---: | ---: | ---: |
| Individuals / Individual | US$1 | 3 | Name and title only |
| Creators / Criador | US$3 | 8 | 160 characters |
| Professionals / Profissional | US$5 | 15 | 400 characters |
| Institutions / Instituição | US$9 | 30 | 800 characters |
| Organisations / Organização | US$15 | 50 | 1,200 characters |

All five include one identity page, editable named links in a chosen order, website, email/phone visibility controls, profile sharing and contact download. These link boxes are additional to the existing website and contact fields. The Professional tier is the suggested balance for a working individual. The audience describes an intended use; any customer can choose any tier.

The US$1 entry point keeps the first step accessible; the higher tiers charge for progressively larger collections of content. Institution and organisation packages describe a single central page for resources, services or departments. They do not sell multiple member identities or a team administration product.

NFC products, delivery, verified credentials, analytics, uploads and team seats are not included in these packages. Taxes and payment-provider fees must be resolved before activating commercial sales. The price points should be validated against operating costs and customer demand before launch.

## Implemented experience

Upgrade plan opens the five-plan comparison. Ver plano opens a package summary. Activar plano de teste persists the selected preview plan without a charge and opens the profile editor with the corresponding capacity. The dashboard shows used/available boxes. Links can be added, reordered and removed, saved as a draft, then published. A downgrade preserves all content and is rejected if the saved draft or published snapshot exceeds the new limits.

The first visit previews Individual without implying a paid subscription. The entire selection flow is explicitly labelled as a preview. Recurring checkout and verified payment-based entitlements are not connected.

## References

- The five audiences come from the supplied WEBSITE.md.
- [Apple One](https://www.apple.com/apple-one/) informed the restrained comparison and progressive disclosure, without copying branding or page assets.
- [Linktree pricing](https://linktr.ee/s/pricing?authuser=0) offers unlimited basic links. Framy should compete on its identity/NFC experience; these capacity tiers alone should not be presented as a unique advantage.

## Validation

Run `npm test` for entitlement boundaries and safe links. With a local server, run `node --experimental-strip-types tests/plans-smoke.mjs` for persisted preview plans, stale changes, cross-origin rejection and server-side capacity enforcement. It restores the starting plan and modifies a draft only when it is the existing labelled test profile; published or customer content is not overwritten.
