import type { Profile } from './domain.ts';
import { cleanText } from './profile-growth.ts';
export const profileLanguages = [
  'en',
  'pt-MZ',
  'zh-Hant',
  'uk',
  'pl',
  'fr',
  'zh-Hans',
] as const;
export type ProfileLanguage = (typeof profileLanguages)[number];
export type ProfileTranslation = {
  title: string;
  bio: string;
  hours: string;
  address: string;
  links: { url: string; label: string }[];
  services: { title: string; description: string; price: string }[];
};
export type ProfileTranslations = Partial<
  Record<ProfileLanguage, ProfileTranslation>
>;
export const emptyProfileTranslation = (): ProfileTranslation => ({
  title: '',
  bio: '',
  hours: '',
  address: '',
  links: [],
  services: [],
});
export function validateProfileTranslations(
  value: unknown,
): ProfileTranslations {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Tradução inválida.');
  const result: ProfileTranslations = {};
  for (const locale of profileLanguages) {
    const raw = (value as Record<string, unknown>)[locale];
    if (raw === undefined) continue;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw Error('Tradução inválida.');
    const v = raw as Record<string, unknown>;
    if (
      (v.links !== undefined && !Array.isArray(v.links)) ||
      (v.services !== undefined && !Array.isArray(v.services))
    )
      throw Error('Tradução inválida.');
    const links = (v.links ?? []) as Record<string, unknown>[];
    const services = (v.services ?? []) as Record<string, unknown>[];
    if (links.length > 50 || services.length > 6)
      throw Error('Tradução inválida.');
    result[locale] = {
      title: cleanText(v.title ?? '', 120),
      bio: cleanText(v.bio ?? '', 1200),
      hours: cleanText(v.hours ?? '', 240),
      address: cleanText(v.address ?? '', 240),
      links: links.map((l) => ({
        url: cleanText(l?.url ?? '', 300),
        label: cleanText(l?.label ?? '', 60),
      })),
      services: services.map((s) => ({
        title: cleanText(s?.title ?? '', 80),
        description: cleanText(s?.description ?? '', 300),
        price: cleanText(s?.price ?? '', 60),
      })),
    };
  }
  return result;
}
/** Translate text only. Contact data, destinations, identity and consent stay intact. */
export function profileInLanguage(source: Profile, locale: ProfileLanguage) {
  const stored = source.translations?.[locale];
  const legacy = locale === 'en' ? source.extras?.english : undefined;
  const version = { ...legacy, ...stored };
  let missing = false;
  const text = (
    original: string | undefined,
    translated: string | undefined,
  ) => {
    if (
      original &&
      !translated &&
      locale !== (source.contentLanguage ?? 'pt-MZ')
    )
      missing = true;
    return translated || original || '';
  };
  const profile: Profile = {
    ...source,
    title: text(source.title, version.title),
    bio: text(source.bio, version.bio),
    links: source.links?.map((l) => ({
      ...l,
      label: text(l.label, stored?.links.find((t) => t.url === l.url)?.label),
    })),
    business: source.business
      ? {
          ...source.business,
          address: text(source.business.address, stored?.address),
          hours: text(source.business.hours, version.hours),
        }
      : undefined,
    extras: source.extras
      ? {
          ...source.extras,
          services: source.extras.services.map((s, i) => ({
            ...s,
            title: text(
              s.title,
              stored?.services[i]?.title ||
                (locale === 'en' ? s.englishTitle : undefined),
            ),
            description: text(
              s.description,
              stored?.services[i]?.description ||
                (locale === 'en' ? s.englishDescription : undefined),
            ),
            price: text(
              s.price,
              stored?.services[i]?.price ||
                (locale === 'en' ? s.englishPrice : undefined),
            ),
          })),
        }
      : undefined,
  };
  return { profile, missing };
}
