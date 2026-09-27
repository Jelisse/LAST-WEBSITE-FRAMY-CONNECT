'use client';
import { useI18n } from '@/components/language-provider';
import type { HeroMedia } from '@/lib/hero-media';
import { SourceImage } from './source-image';
import { responsiveImage } from '@/lib/responsive-images';
import { HeroVideo } from './hero-video';
export function HomeHeroScene({ media }: { media: HeroMedia }) {
  const { t } = useI18n();
  return (
    <section
      className="home-hero-scene"
      aria-label={t('Vídeos Framy Connect, cartão Solange e porta-chaves NFC')}
    >
      <div className="home-scene-base" data-motion-layer="base">
        <SourceImage
          src="/home/pedestal.webp"
          sizes="(max-width: 700px) 100vw, 700px"
          alt=""
          width={2079}
          height={756}
          loading="eager"
        />
        <svg
          className="home-base-extension"
          viewBox="0 380 2079 60"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <image
            href={responsiveImage('/home/pedestal.webp').src}
            width="2079"
            height="756"
          />
        </svg>
      </div>
      <div
        className="home-scene-card home-front-card"
        data-motion-layer="card-front"
      >
        <SourceImage
          loading="eager"
          src={media.cardFront}
          sizes="(max-width: 700px) 22vw, 210px"
          alt={t('Frente do cartão')}
          width={1024}
          height={1600}
        />
      </div>
      <div
        className="home-scene-card home-solange-card"
        data-motion-layer="card"
      >
        <SourceImage
          loading="eager"
          src={media.card}
          sizes="(max-width: 700px) 25vw, 230px"
          alt={t('Cartão NFC Framy Connect')}
          width={816}
          height={1290}
        />
      </div>
      <div
        className="home-scene-keychain home-photo-keychain"
        data-motion-layer="keychain"
      >
        <SourceImage
          loading="eager"
          src={media.keychain}
          sizes="(max-width: 700px) 25vw, 250px"
          alt={t('Porta-chaves NFC Framy Connect')}
          width={1280}
          height={1280}
        />
      </div>
      <div className="home-scene-phone" data-motion-layer="phone">
        <SourceImage
          className="home-phone-shell"
          src="/home/iphone-side-shell.webp"
          sizes="(max-width: 700px) 30vw, 280px"
          alt=""
          width={896}
          height={1792}
          loading="eager"
        />
        <div className="home-phone-display">
          <HeroVideo sources={[media.video1, media.video2]} />
          <span className="home-phone-island" />
          <span className="home-phone-homebar" />
        </div>
      </div>
    </section>
  );
}
