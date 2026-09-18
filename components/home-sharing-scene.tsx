'use client';
import { useI18n } from '@/components/language-provider';

import { SourceImage } from '@/components/source-image';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Nfc, ScanLine, Globe, Camera, Zap } from 'lucide-react';

const exampleProfile = '/exemplo';

function DemoCard({ qr }: { qr?: string }) {
  const { t } = useI18n();
  return (
    <div className="sharing-card">
      <Image
        src="/brand/logo.svg"
        alt={t('Framy Connect')}
        width={160}
        height={73}
        unoptimized
      />
      <div className="sharing-card-identity">
        <strong>{t('FIRMINO CHAMBALE')}</strong>
        <span>{t('Arquitecto e Planeador Fisico')}</span>
        <i />
        <small>
          <SourceImage src="/social/instagram.svg" alt="" />
          {t(' Instagram')}
        </small>
        <small>
          <Globe />
          {t(' Perfil Framy Connect')}
        </small>
      </div>
      <span className="sharing-card-tagline">
        {t('O Seu Mundo num Toque.')}
      </span>
      {qr ? (
        <SourceImage
          className="sharing-qr"
          src={qr}
          alt={t('QR para abrir o perfil de exemplo')}
        />
      ) : (
        <Nfc className="sharing-nfc" />
      )}
    </div>
  );
}

function DemoPhone({ scan, qr }: { scan?: boolean; qr?: string }) {
  const { t } = useI18n();
  return (
    <div className={`sharing-phone${scan ? ' sharing-phone-scan' : ''}`}>
      <Image
        className="sharing-shell"
        src="/home/iphone-side-shell.png"
        alt=""
        width={896}
        height={1792}
        unoptimized
      />
      <div className="sharing-screen">
        {scan ? (
          <div className="sharing-camera">
            <span>{t('Ler código QR')}</span>
            <DemoCard qr={qr} />
            <div className="sharing-scan-frame" />
            <div className="sharing-camera-controls">
              <Zap />
              <i />
              <Camera />
            </div>
          </div>
        ) : (
          <Image
            src="/home/profile-screen.jpg"
            alt={t('Perfil Framy de Firmino Chambale')}
            fill
            unoptimized
            sizes="260px"
          />
        )}
        <span className="home-phone-island" />
      </div>
    </div>
  );
}

export function HomeSharingScene() {
  const { t } = useI18n();
  const [qr, setQr] = useState<string>();
  useEffect(() => {
    let active = true;
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(new URL(exampleProfile, window.location.origin).href, {
          width: 240,
          margin: 2,
          color: { dark: '#30231e', light: '#ffffff' },
        }),
      )
      .then((image) => {
        if (active) setQr(image);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <section
      className="home-sharing"
      id="como-funciona"
      aria-labelledby="sharing-title"
    >
      <header>
        <p>{t('DUAS FORMAS DE SE CONECTAR')}</p>
        <h2 id="sharing-title">{t('Um toque. Um scan. O seu perfil.')}</h2>
        <span>{t('Partilhe a sua identidade por NFC ou código QR.')}</span>
      </header>
      <div className="sharing-stage">
        <div className="sharing-method sharing-tap">
          <h3>
            <Nfc size={18} />
            {t(' Partilhe por toque')}
          </h3>
          <svg
            className="sharing-wave"
            viewBox="0 0 110 110"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="55" cy="55" r="22" />
            <circle cx="55" cy="55" r="33" />
            <circle cx="55" cy="55" r="44" />
            <circle cx="55" cy="55" r="53" />
          </svg>
          <DemoCard />
          <DemoPhone />
          <p>{t('Aproxime o cartão de um telemóvel compatível.')}</p>
        </div>
        <a
          href={exampleProfile}
          className="sharing-result"
          aria-label={t('Abrir o perfil de exemplo de Firmino Chambale')}
        >
          <div>
            <Image
              src="/home/profile-screen.jpg"
              alt={t('O mesmo perfil Framy, com fotografia e links')}
              width={390}
              height={848}
              unoptimized
            />
          </div>
        </a>
        <div className="sharing-method sharing-scan">
          <h3>
            <ScanLine size={18} />
            {t(' Ou leia o QR')}
          </h3>
          <DemoCard qr={qr} />
          <DemoPhone scan qr={qr} />
          <p>{t('Abra a câmara e leia o código do cartão.')}</p>
        </div>
        <svg
          className="sharing-arrows"
          viewBox="0 0 1000 90"
          aria-hidden="true"
        >
          <defs>
            <path
              id="sharing-tapered-arrow"
              d="M235 13 C282 51 343 73 409 36 L407 28 L428 27 L418 46 L415 39 C345 83 282 56 235 13Z"
            />
          </defs>
          <use href="#sharing-tapered-arrow" fill="currentColor" />
          <use
            href="#sharing-tapered-arrow"
            transform="translate(1000 0) scale(-1 1)"
            fill="currentColor"
          />
        </svg>
      </div>
      <a className="home-text-link sharing-demo-link" href={exampleProfile}>
        {t('Ver perfil de exemplo ')}
        <Globe size={18} />
      </a>
    </section>
  );
}
