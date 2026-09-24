import { getTranslations } from '@/lib/server-i18n';
import Image from 'next/image';
import { Nfc } from 'lucide-react';
import { HomeNfcKeychain } from './home-nfc-keychain';

/** Independent transform layers, ready for future motion. The screen is static. */
export async function HomeHeroScene() {
  const t = await getTranslations();
  return (
    <section
      className="home-hero-scene"

      aria-label={t(
        'iPhone com um exemplo de perfil Framy, cartões NFC laranja e preto e porta-chaves NFC sobre uma base',
      )}
    >
      <div className="home-scene-base" data-motion-layer="base">
        <Image
          src="/home/pedestal.png"
          alt=""
          width={2079}
          height={756}
          unoptimized
          priority
        />
        <svg className="home-base-extension" viewBox="0 380 2079 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <image href="/home/pedestal.png" width="2079" height="756" />
        </svg>
      </div>
      {(['black'] as const).map((color) => (
        <div
          key={color}
          className={`home-back-card home-back-card-${color}`}
          data-motion-layer={`card-${color}`}
        >
          <Nfc />
          <Image
            src="/brand/logo.svg"
            alt=""
            width={220}
            height={100}
            unoptimized
          />
          <p>
            {t('O Seu Mundo')}
            <br />
            {t('num Toque.')}
          </p>
        </div>
      ))}
      <div className="home-scene-card" data-motion-layer="card">
        <Image
          className="home-card-surface"
          src="/home/nfc-card-matte.png"
          alt=""
          width={1024}
          height={1536}
          unoptimized
          priority
        />
        <div className="home-card-print">
          <Nfc className="home-card-nfc" />
          <Image
            className="home-card-logo"
            src="/brand/logo.svg"
            alt=""
            width={220}
            height={100}
            unoptimized
          />
          <p>
            {t('O Seu Mundo')}
            <br />
            {t('num Toque.')}
          </p>
        </div>
      </div>
      <HomeNfcKeychain />
      <div className="home-scene-phone" data-motion-layer="phone">
        <Image
          className="home-phone-shell"
          src="/home/iphone-side-shell.png"
          alt=""
          width={896}
          height={1792}
          unoptimized
          priority
        />
        <div className="home-phone-display">
          <Image
            src="/home/profile-screen.jpg"
            alt=""
            fill
            unoptimized
            priority
            sizes="(max-width: 700px) 42vw, 300px"
          />
          <span className="home-phone-island" />
          <span className="home-phone-homebar" />
        </div>
      </div>
    </section>
  );
}
