'use client';
import Image from 'next/image';
import { useState } from 'react';
import {
  Camera,
  Globe2,
  Mail,
  Phone,
  QrCode,
  Share2,
  UserRoundPlus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Profile } from '@/lib/domain';

function SocialIcon({ url }: { url: string }) {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {}
  const domain = (name: string) => host === name || host.endsWith(`.${name}`);
  const brand = domain('instagram.com')
    ? 'instagram'
    : domain('tiktok.com')
      ? 'tiktok'
      : domain('wa.me') || domain('whatsapp.com')
        ? 'whatsapp'
        : domain('line.me') || domain('line.naver.jp')
          ? 'line'
          : null;
  if (brand)
    return (
      <Image
        src={`/social/${brand}.svg`}
        alt=""
        width={48}
        height={48}
        unoptimized
        className="mobile-social-icon"
      />
    );
  if (url.startsWith('mailto:')) return <Mail />;
  if (url.startsWith('tel:')) return <Phone />;
  return <Globe2 />;
}
const escapeVcf = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
export function MobileProfile({
  profile,
  published = false,
  preview = false,
}: {
  profile: Profile;
  published?: boolean;
  preview?: boolean;
}) {
  const [message, setMessage] = useState(''),
    [qr, setQr] = useState(''),
    [qrOpen, setQrOpen] = useState(false),
    [qrBusy, setQrBusy] = useState(false);
  const Heading = preview ? 'h2' : 'h1';
  const links = [
    ...(profile.links ?? []),
    ...(profile.email && profile.showEmail
      ? [{ label: 'Email', url: `mailto:${profile.email}` }]
      : []),
    ...(profile.phone && profile.showPhone
      ? [
          {
            label: 'Telefone',
            url: `tel:${profile.phone.replace(/[^+0-9]/g, '')}`,
          },
        ]
      : []),
    ...(profile.website ? [{ label: 'Website', url: profile.website }] : []),
  ];
  function profileUrl() {
    return new URL(`/${profile.username}`, window.location.origin).href;
  }
  function download() {
    const values = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${escapeVcf(profile.name)}`,
      `TITLE:${escapeVcf(profile.title)}`,
      ...(profile.showEmail && profile.email
        ? [`EMAIL:${escapeVcf(profile.email)}`]
        : []),
      ...(profile.showPhone && profile.phone
        ? [`TEL:${escapeVcf(profile.phone)}`]
        : []),
      ...(profile.website ? [`URL:${escapeVcf(profile.website)}`] : []),
      'END:VCARD',
    ];
    const url = URL.createObjectURL(
      new Blob([values.join('\r\n')], { type: 'text/vcard;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${profile.username || 'framy-contacto'}.vcf`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Contacto descarregado.');
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: profile.name, url: profileUrl() });
      else {
        await navigator.clipboard.writeText(profileUrl());
        setMessage('Link copiado.');
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError'))
        setMessage(`O seu link: ${profileUrl()}`);
    }
  }
  async function showQr() {
    setQrBusy(true);
    setMessage('');
    try {
      const { default: QRCode } = await import('qrcode');
      setQr(
        await QRCode.toDataURL(profileUrl(), {
          width: 400,
          margin: 4,
          errorCorrectionLevel: 'M',
        }),
      );
      setQrOpen(true);
    } catch {
      setMessage('Não foi possível gerar o QR. Tente novamente.');
    } finally {
      setQrBusy(false);
    }
  }
  return (
    <div className="mobile-profile-frame">
      <article className="mobile-identity-page">
        <div className="mobile-portrait">
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={
                profile.name
                  ? `Fotografia de ${profile.name}`
                  : 'Fotografia de perfil'
              }
              fill
              unoptimized
              sizes="(max-width: 600px) 100vw, 500px"
              style={{
                objectFit: 'cover',
                objectPosition: `center ${profile.photoPosition ?? 35}%`,
              }}
            />
          ) : (
            <div className="mobile-photo-placeholder">
              <Camera />
              <span>A sua fotografia aparece aqui</span>
            </div>
          )}
        </div>
        <div className="mobile-profile-wave" aria-hidden="true" />
        <div className="mobile-profile-body">
          <Heading>{profile.name || 'O seu nome'}</Heading>
          <p className="mobile-profile-title">
            {profile.title || 'O seu título ou profissão'}
          </p>
          {profile.bio && <p className="mobile-profile-bio">{profile.bio}</p>}
          <nav
            className="mobile-profile-links"
            aria-label="Links do perfil — deslize para ver mais"
            tabIndex={0}
          >
            {links.map((link, index) => (
              <a
                key={index}
                href={
                  /^(https:\/\/|mailto:|tel:)/i.test(link.url)
                    ? link.url
                    : undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!/^(https:\/\/|mailto:|tel:)/i.test(link.url)}
              >
                <SocialIcon url={link.url} />
                <span>{link.label || 'Título do link'}</span>
              </a>
            ))}
            {!links.length && preview && (
              <p className="mobile-links-placeholder">
                Adicione os seus links no editor.
              </p>
            )}
          </nav>
          <div className="mobile-profile-actions">
            <button
              type="button"
              aria-label="Adicionar aos contactos"
              title="Adicionar aos contactos"
              disabled={!profile.name}
              onClick={download}
            >
              <UserRoundPlus />
            </button>
            <button
              type="button"
              aria-label="Mostrar QR do perfil"
              title={
                published
                  ? 'Mostrar QR do perfil'
                  : 'Publique o perfil para activar o QR'
              }
              disabled={!published || qrBusy}
              onClick={showQr}
            >
              <QrCode />
            </button>
            <button
              type="button"
              aria-label="Partilhar perfil"
              title={
                published
                  ? 'Partilhar perfil'
                  : 'Publique o perfil para partilhar'
              }
              disabled={!published}
              onClick={share}
            >
              <Share2 />
            </button>
          </div>
          {message && (
            <output className="mobile-profile-message">{message}</output>
          )}
          <footer className="mobile-profile-footer">
            <Image
              src="/brand/logo.svg"
              alt="Framy Connect"
              width={220}
              height={100}
              unoptimized
            />
            <small>Todos direitos reservados {new Date().getFullYear()}</small>
          </footer>
        </div>
      </article>
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="profile-qr-dialog">
          <DialogTitle>O seu QR Framy</DialogTitle>
          <DialogDescription>
            Digitalize para abrir o perfil publicado.
          </DialogDescription>
          {qr && (
            <Image
              src={qr}
              alt={`QR do perfil ${profile.name}`}
              width={400}
              height={400}
              unoptimized
            />
          )}
          <a href={`/${profile.username}`} target="_blank" rel="noreferrer">
            /{profile.username}
          </a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
