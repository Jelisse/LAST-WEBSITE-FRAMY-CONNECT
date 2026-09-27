import 'server-only';
import { env } from 'cloudflare:workers';
import { heroDefaults, heroSlots, type HeroMedia } from './hero-media';
// Cache only completed public settings, never request-owned R2 promises.
// Other worker instances observe manager edits within 30 seconds.
const settings = new WeakMap<R2Bucket, { media: HeroMedia; expires: number }>();
export function invalidateHeroMedia() {
  if (env.PROFILE_PHOTOS) settings.delete(env.PROFILE_PHOTOS);
}
export async function getHeroMedia(): Promise<HeroMedia> {
  const media = { ...heroDefaults };
  if (!env.PROFILE_PHOTOS) return media;
  const bucket = env.PROFILE_PHOTOS;
  const cached = settings.get(bucket);
  if (cached && cached.expires > Date.now()) return { ...cached.media };
  await Promise.all(heroSlots.map(async (slot) => {
    const object = await bucket.get(`hero/settings/${slot}`);
    if (object) {
      const value = await object.json<{ url: string }>();
      if (/^\/api\/hero-media\/[0-9a-f-]{36}$/.test(value.url)) media[slot] = value.url;
    }
  }));
  settings.set(bucket, { media: { ...media }, expires: Date.now() + 30_000 });
  return media;
}
