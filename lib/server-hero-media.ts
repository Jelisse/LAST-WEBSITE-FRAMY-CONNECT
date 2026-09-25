import 'server-only';
import { env } from 'cloudflare:workers';
import { heroDefaults, heroSlots, type HeroMedia } from './hero-media';
export async function getHeroMedia(): Promise<HeroMedia> {
  const media = { ...heroDefaults };
  if (!env.PROFILE_PHOTOS) return media;
  await Promise.all(heroSlots.map(async (slot) => {
    const object = await env.PROFILE_PHOTOS.get(`hero/settings/${slot}`);
    if (object) {
      const value = await object.json<{ url: string }>();
      if (/^\/api\/hero-media\/[0-9a-f-]{36}$/.test(value.url)) media[slot] = value.url;
    }
  }));
  return media;
}
