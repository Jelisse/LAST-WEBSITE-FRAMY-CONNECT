'use client';
import { useI18n } from '@/components/language-provider';
import type { HeroMedia } from '@/lib/hero-media';
import Image from 'next/image';
import { HeroVideo } from './hero-video';
export function HomeHeroScene({ media }: { media: HeroMedia }) {
  const { t } = useI18n();
  return <section className="home-hero-scene" aria-label={t('Vídeos Framy Connect, cartão Solange e porta-chaves NFC')}>
    <div className="home-scene-base" data-motion-layer="base">
      <Image src="/home/pedestal.png" alt="" width={2079} height={756} unoptimized priority />
      <svg className="home-base-extension" viewBox="0 380 2079 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <image href="/home/pedestal.png" width="2079" height="756" />
      </svg>
    </div>
    <div className="home-scene-card home-front-card" data-motion-layer="card-front">
      <Image unoptimized priority src={media.cardFront} alt={t('Frente do cartão')} width={1024} height={1600} />
    </div>
    <div className="home-scene-card home-solange-card" data-motion-layer="card">
      <Image unoptimized priority src={media.card} alt={t('Cartão NFC Framy Connect')} width={816} height={1290} />
    </div>
    <div className="home-scene-keychain home-photo-keychain" data-motion-layer="keychain">
      <Image unoptimized priority src={media.keychain} alt={t('Porta-chaves NFC Framy Connect')} width={1280} height={1280} />
    </div>
    <div className="home-scene-phone" data-motion-layer="phone">
      <Image className="home-phone-shell" src="/home/iphone-side-shell.png" alt="" width={896} height={1792} unoptimized priority />
      <div className="home-phone-display">
        <HeroVideo sources={[media.video1, media.video2]} />
        <span className="home-phone-island" />
        <span className="home-phone-homebar" />
      </div>
    </div>
  </section>;
}
