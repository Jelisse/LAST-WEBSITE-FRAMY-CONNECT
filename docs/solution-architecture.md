# Solution discovery and focused pages

Implemented 25 October 2026. Local application changes; deployment is separate.

## Shared content

`lib/solution-paths.ts` owns the six existing stories and their visual presentation: legacy anchor, slug, photograph, card summary, benefits and relevant demonstration mode. The desktop Solutions menu, mobile menu, homepage discovery cards, Why Framy overview and dedicated pages consume the same records. `lib/public-navigation.ts` also derives its solution links from these records.

Routes: `/solucoes/profissionais`, `/solucoes/criadores`, `/solucoes/consultorios`, `/solucoes/eventos`, `/solucoes/equipas`, `/solucoes/contactos-actualizados`. Unknown slugs return 404. The sitemap includes all six. The previous `/porque-framy#trabalho`, `#criadores`, `#consultorio`, `#eventos`, `#equipas` and `#actualizar` anchors now identify the corresponding discovery cards, which link to the new pages.

## Content journey

Each page contains a photographic hero, short situation and solution, three benefits, the existing interactive Framy demonstration, optional approved testimonial, three setup steps, appropriate plan actions, FAQs, closing action and two related solutions. Demonstrations retain their fictional-person/data labels. Individual and corporate content use their respective plan boundaries; no pricing, inventory, customer data, subscription activation or payment processing is changed.

Personal free paths enter `/perfil`. Professional review enters `/perfil?billing=1`. Business and Enterprise keep explicit `offer` parameters through the existing safe authentication flow. The earlier pending plan-entry work remains part of the workspace.

## Testimonials

`lib/solution-testimonials.ts` is empty until genuine customer statements and permission are available. `testimonialFor` accepts only a matching record with `approved: true`. No placeholder, invented customer quote, stock portrait presented as a customer or empty testimonial space is published. Add a genuine approved statement with its solution slug, name and role to enable the section. A future content-management interface can replace this registry independently.

## Images and interaction

Six new illustrative photographs were generated using the built-in image tool and optimized as 1200px and 480px WebP files. The full set is approximately 754 KB. Exact prompts, fictional-person provenance and file links are recorded in `public/solutions/README.md`. Originals remain in the Codex generated-images directory. No HiHello images, logos or testimonials were copied.

Photographs have reserved 3:2 geometry and responsive sources. Hero images load eagerly; navigation and discovery photos load lazily. The pointer effect uses a small contained image zoom and animated terracotta underline; other photos soften without reducing text contrast. Card dimensions remain stable. Keyboard focus is visible, touch links navigate with one tap, and reduced-motion settings suppress movement. Desktop menus keep click/keyboard/outside/Escape behavior; mobile Solutions expands into a photo list.
