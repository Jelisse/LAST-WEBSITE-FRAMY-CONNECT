import type { Profile } from './domain.ts';
import { socialPlatform } from './social-platform.ts';
import { whatsappURL } from './profile-business.ts';

export type ProfileActionLink = {
  target: string;
  label: string;
  url: string;
  platform: string | null;
};

/** Presentation only: callers supply the existing entitlement-filtered profile.
 * Keep original link indexes as analytics/campaign targets when regrouping. */
export function profileLinkGroups(
  profile: Profile,
  t: (value: string) => string,
) {
  const whatsapp = whatsappURL(profile.business);
  const links = [
    ...(profile.links ?? []).map((link, index) => ({
      ...link,
      target: `link:${index}`,
    })),
    ...(profile.email && profile.showEmail
      ? [{ target: 'email', label: t('Email'), url: `mailto:${profile.email}` }]
      : []),
    ...(profile.phone && profile.showPhone
      ? [
          {
            target: 'phone',
            label: t('Ligar'),
            url: `tel:${profile.phone.replace(/[^+0-9]/g, '')}`,
          },
        ]
      : []),
    ...(profile.website
      ? [{ target: 'website', label: t('Website'), url: profile.website }]
      : []),
    ...(whatsapp
      ? [{ target: 'whatsapp', label: 'WhatsApp', url: whatsapp }]
      : []),
  ];
  const groups: {
    contacts: ProfileActionLink[];
    socials: ProfileActionLink[];
    explore: ProfileActionLink[];
  } = { contacts: [], socials: [], explore: [] };
  for (const link of links) {
    const platform = socialPlatform(link.url);
    const action = { ...link, platform };
    if (/^(mailto:|tel:)/i.test(link.url) || platform === 'whatsapp')
      groups.contacts.push(action);
    else if (platform) groups.socials.push(action);
    else groups.explore.push(action);
  }
  const contactOrder = (link: ProfileActionLink) => /^mailto:/i.test(link.url) ? 0 : /^tel:/i.test(link.url) ? 1 : 2;
  groups.contacts.sort((a, b) => contactOrder(a) - contactOrder(b));
  return groups;
}

export function profileActionHref(url: string): string | undefined {
  if (Array.from(url).some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password)
      return url;
    if (['mailto:', 'tel:'].includes(parsed.protocol) && parsed.pathname)
      return url;
  } catch {
    /* Invalid drafts remain visible but cannot navigate. */
  }
  return undefined;
}

export function socialActionName(link: ProfileActionLink): string {
  const names: Record<string, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    whatsapp: 'WhatsApp',
    wechat: 'WeChat',
    line: 'LINE',
    twitter: 'Twitter',
    x: 'X',
    github: 'GitHub',
    snapchat: 'Snapchat',
    pinterest: 'Pinterest',
    telegram: 'Telegram',
    messenger: 'Messenger',
    threads: 'Threads',
    reddit: 'Reddit',
    discord: 'Discord',
    twitch: 'Twitch',
    spotify: 'Spotify',
    behance: 'Behance',
    dribbble: 'Dribbble',
    vimeo: 'Vimeo',
    signal: 'Signal',
    patreon: 'Patreon',
    bluesky: 'Bluesky',
  };
  const platform = names[link.platform ?? ''] ?? link.label;
  return link.label && link.label.toLowerCase() !== platform.toLowerCase()
    ? `${platform} · ${link.label}`
    : platform;
}
