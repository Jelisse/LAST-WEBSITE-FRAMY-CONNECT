/** Match the destination hostname, never the customer-supplied link label. */
const platforms: Record<string, readonly string[]> = {
  instagram: ['instagram.com', 'instagr.am'],
  tiktok: ['tiktok.com'],
  whatsapp: ['whatsapp.com', 'wa.me'],
  line: ['line.me', 'line.naver.jp', 'lin.ee'],
  wechat: ['wechat.com', 'weixin.qq.com', 'weixin.com'],
  telegram: ['telegram.org', 'telegram.me', 't.me'],
  facebook: ['facebook.com', 'fb.com', 'fb.me', 'fb.watch'],
  messenger: ['messenger.com', 'm.me'],
  twitter: ['twitter.com'],
  x: ['x.com', 't.co'],
  youtube: ['youtube.com', 'youtu.be'],
  linkedin: ['linkedin.com', 'lnkd.in'],
  threads: ['threads.net', 'threads.com'],
  snapchat: ['snapchat.com'],
  pinterest: ['pinterest.com', 'pin.it'],
  reddit: ['reddit.com', 'redd.it'],
  discord: ['discord.com', 'discord.gg'],
  twitch: ['twitch.tv'],
  spotify: ['spotify.com', 'spotify.link'],
  github: ['github.com'],
  behance: ['behance.net'],
  dribbble: ['dribbble.com'],
  vimeo: ['vimeo.com'],
  signal: ['signal.me', 'signal.org'],
  patreon: ['patreon.com'],
  bluesky: ['bsky.app', 'bsky.social'],
};

export function socialPlatform(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
    return (
      Object.entries(platforms).find(([, domains]) =>
        domains.some(
          (domain) => host === domain || host.endsWith(`.${domain}`),
        ),
      )?.[0] ?? null
    );
  } catch {
    return null;
  }
}
