'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Nfc, ScanLine, Globe, Camera, Zap } from 'lucide-react';

const exampleProfile = '/exemplo';

function DemoCard({ qr }: { qr?: string }) {
  return (
    <div className="sharing-card">
      <Image
        src="/brand/logo.svg"
        alt="Framy Connect"
        width={160}
        height={73}
        unoptimized
      />
      <div className="sharing-card-identity">
        <strong>FIRMINO CHAMBALE</strong>
        <span>Arquitecto e Planeador Fisico</span>
        <i />
        <small>
          <img src="/social/instagram.svg" alt="" /> Instagram
        </small>
        <small>
          <Globe /> Perfil Framy Connect
        </small>
      </div>
      <span className="sharing-card-tagline">O Seu Mundo num Toque.</span>
      {qr ? (
        <img
          className="sharing-qr"
          src={qr}
          alt="QR para abrir o perfil de exemplo"
        />
      ) : (
        <Nfc className="sharing-nfc" />
      )}
    </div>
  );
}

function DemoPhone({ scan, qr }: { scan?: boolean; qr?: string }) {
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
            <span>Ler código QR</span>
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
            alt="Perfil Framy de Firmino Chambale"
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
        <p>DUAS FORMAS DE SE CONECTAR</p>
        <h2 id="sharing-title">Um toque. Um scan. O seu perfil.</h2>
        <span>Partilhe a sua identidade por NFC ou código QR.</span>
      </header>
      <div className="sharing-stage">
        <div className="sharing-method sharing-tap">
          <h3>
            <Nfc size={18} /> Partilhe por toque
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
          <p>Aproxime o cartão de um telemóvel compatível.</p>
        </div>
        <a
          href={exampleProfile}
          className="sharing-result"
          aria-label="Abrir o perfil de exemplo de Firmino Chambale"
        >
          <div>
            <Image
              src="/home/profile-screen.jpg"
              alt="O mesmo perfil Framy, com fotografia e links"
              width={390}
              height={848}
              unoptimized
            />
          </div>
        </a>
        <div className="sharing-method sharing-scan">
          <h3>
            <ScanLine size={18} /> Ou leia o QR
          </h3>
          <DemoCard qr={qr} />
          <DemoPhone scan qr={qr} />
          <p>Abra a câmara e leia o código do cartão.</p>
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
        Ver perfil de exemplo <Globe size={18} />
      </a>
    </section>
  );
}
