import Image from 'next/image';
import { Nfc } from 'lucide-react';

/** Independent transform layers, ready for future motion. The screen is static. */
export function HomeHeroScene() {
  return (
    <div
      className="home-hero-scene"
      role="img"
      aria-label="iPhone com um exemplo de perfil Framy e cartão NFC laranja sobre uma base"
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
      </div>
      <div className="home-scene-card" data-motion-layer="card">
        <Image
          src="/home/nfc-card-blank.png"
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
            O Seu Mundo
            <br />
            num Toque.
          </p>
        </div>
      </div>
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
    </div>
  );
}
