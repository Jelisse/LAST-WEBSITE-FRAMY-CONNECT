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
    <section className="home-sharing" id="como-funciona" aria-labelledby="sharing-title">
      <header>
        <p>{t('DUAS FORMAS DE SE CONECTAR')}</p>
        <h2 id="sharing-title">{t('Duas formas. Um perfil.')}</h2>
        <span>{t('Partilhe por toque ou código QR.')}</span>
      </header>
      <div className="sharing-stage">
        <article className="sharing-method sharing-tap">
          <h3><Nfc size={22} aria-hidden="true" />{t('Toque para partilhar')}</h3>
          <div className="sharing-illustration">
            <DemoCard />
            <DemoPhone />
          </div>
          <p>{t('Aproxime o cartão de um telemóvel compatível com NFC.')}</p>
        </article>
        <article className="sharing-method sharing-scan">
          <h3><ScanLine size={22} aria-hidden="true" />{t('Leia o QR para se conectar')}</h3>
          <div className="sharing-illustration">
            <DemoCard qr={qr} />
            <DemoPhone scan qr={qr} />
          </div>
          <p>{t('Abra a câmara e leia o código QR do cartão.')}</p>
        </article>
      </div>
      <a className="home-text-link sharing-demo-link" href={exampleProfile}>
        {t('Ver perfil de exemplo ')}<Globe size={18} aria-hidden="true" />
      </a>
    </section>
  );
}
