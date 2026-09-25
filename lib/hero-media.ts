export const heroDefaults = {
  video1: '/home/card-promo.mp4',
  video2: '/home/keychain-promo.mp4',
  card: '/home/solange-card.png',
  cardFront: '/home/solange-card-front.png',
  keychain: '/home/framy-keychain.png',
  tapCard: '/home/orange-card-front.png',
  tapProfile: '/home/solange-profile.jpg',
  scanCard: '/home/solange-card.png',
};
export type HeroSlot = keyof typeof heroDefaults;
export type HeroMedia = Record<HeroSlot, string>;
export const heroSlots = Object.keys(heroDefaults) as HeroSlot[];
export function isHeroSlot(value: string): value is HeroSlot {
  return heroSlots.includes(value as HeroSlot);
}
export function heroMediaType(bytes: Uint8Array, video: boolean) {
  const text = (a: number, b: number) => new TextDecoder().decode(bytes.slice(a, b));
  if (video) return bytes.length >= 12 && text(4, 8) === 'ftyp' ? 'video/mp4' : null;
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (text(0,4) === 'RIFF' && text(8,12) === 'WEBP') return 'image/webp';
  return null;
}
