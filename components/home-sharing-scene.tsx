'use client';
import { useI18n } from '@/components/language-provider';
import type { HeroMedia } from '@/lib/hero-media';
import { SourceImage } from './source-image';
import Link from '@/components/hard-link';
import { Nfc, ScanLine, Globe, Camera, Zap } from 'lucide-react';
import { demoProfile } from '@/lib/demo-profile';
import { DemoCardQr } from './demo-card-qr';

function DemoPhone({
  image,
  scan = false,
  label,
  alt,
}: {
  image: string;
  scan?: boolean;
  label: string;
  alt: string;
}) {
  const { t } = useI18n();
  const profile = demoProfile(t);
  return (
    <div className={`sharing-phone${scan ? ' sharing-phone-scan' : ''}`}>
      <SourceImage
        className="sharing-shell"
        src="/home/iphone-side-shell.webp"
        alt=""
        sizes="(max-width: 700px) 150px, 190px"
        width={896}
        height={1792}
      />
      <div className="sharing-screen">
        {scan ? (
          <div className="sharing-camera sharing-solange-camera">
            <span>{label}</span>
            <div className="sharing-camera-card">
              <div className="sharing-camera-art">
                <SourceImage
                  src={image}
                  alt={alt}
                  sizes="(max-width: 700px) 130px, 180px"
                  width={816}
                  height={1290}
                />
                <DemoCardQr source={image} />
              </div>
              <div className="sharing-scan-frame" aria-hidden="true" />
            </div>
            <div className="sharing-camera-controls" aria-hidden="true">
              <Zap />
              <i />
              <Camera />
            </div>
            <span className="home-phone-island" />
          </div>
        ) : (
          <div className="sharing-demo-profile">
            <SourceImage src={image} alt={profile.name} sizes="190px" />
            <div className="sharing-demo-content">
              <strong>{profile.name}</strong>
              <span>{profile.title}</span>
              {profile.links.map((link) => (
                <span className="sharing-demo-link-preview" key={link.url}>
                  {link.label}
                </span>
              ))}
              <small>FRAMY CONNECT</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HomeSharingScene({ media }: { media: HeroMedia }) {
  const { t } = useI18n();
  return (
    <section
      className="home-sharing"
      id="como-funciona"
      aria-labelledby="sharing-title"
    >
      <header>
        <h2 id="sharing-title">{t('Duas formas. Um perfil.')}</h2>
      </header>
      <div className="sharing-stage">
        <article className="sharing-method sharing-tap">
          <h3>
            <Nfc size={22} aria-hidden="true" />
            {t('Toque para partilhar')}
          </h3>
          <div className="sharing-illustration sharing-product-demo">
            <div className="sharing-product-card sharing-orange-front">
              <SourceImage
                src={media.tapCard}
                alt={t('Frente do cartão NFC laranja')}
                sizes="(max-width: 700px) 130px, 180px"
                width={1024}
                height={1600}
              />
            </div>
            <svg
              className="sharing-nfc-pulse"
              viewBox="0 0 100 100"
              fill="none"
              aria-hidden="true"
            >
              <path d="M20 38 Q31 50 20 62" />
              <path d="M39 25 Q61 50 39 75" />
              <path d="M60 12 Q94 50 60 88" />
            </svg>
            <DemoPhone image={media.tapProfile} label="" alt="Angela Khossa" />
          </div>
          <p>{t('Aproxime o cartão de um telemóvel compatível com NFC.')}</p>
        </article>
        <article className="sharing-method sharing-scan">
          <h3>
            <ScanLine size={22} aria-hidden="true" />
            {t('Leia o QR para se conectar')}
          </h3>
          <div className="sharing-illustration sharing-product-demo">
            <div className="sharing-product-card sharing-black-back">
              <SourceImage
                src={media.scanCard}
                alt={t('Verso do cartão')}
                sizes="(max-width: 700px) 130px, 180px"
                width={816}
                height={1290}
              />
              <DemoCardQr source={media.scanCard} />
            </div>
            <DemoPhone
              image={media.scanCard}
              scan
              label={t('Ler código QR')}
              alt={t('O mesmo cartão na câmara do telemóvel')}
            />
          </div>
          <p>{t('Abra a câmara e leia o código QR do cartão.')}</p>
        </article>
      </div>
      <Link className="home-text-link sharing-demo-link" href="/exemplo">
        {t('Ver perfil de exemplo ')}
        <Globe size={18} aria-hidden="true" />
      </Link>
    </section>
  );
}
