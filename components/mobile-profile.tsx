'use client';
import { ProfilePublicExtras } from './profile-public-extras';
import { ProfileConnectionCount } from './profile-connection-count';
import { useI18n } from '@/components/language-provider';
import { translator } from '@/lib/i18n';

import Image from 'next/image';
import { PortraitBackground } from './portrait-background';
import { portraitMask, portraitPath } from '@/lib/portrait-design';
import { useState, type CSSProperties } from 'react';
import {
  whatsappURL,
  directionsURL,
  profileColorHex,
  profileColorIsLight,
} from '@/lib/profile-business';
import {
  useProfileEngagement,
  ProfileMeasurementChoice,
} from './profile-engagement';
import {
  Camera,
  Languages,
  Globe2,
  Mail,
  MessageCircle,
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
import { socialPlatform } from '@/lib/social-platform';

function SocialIcon({ url }: { url: string }) {
  const brand = socialPlatform(url);
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
  profile: sourceProfile,
  published = false,
  preview = false,
  brandHref = '/',
  measure = true,
  demoConnectionLabel,
}: {
  profile: Profile;
  published?: boolean;
  preview?: boolean;
  brandHref?: string;
  measure?: boolean;
  demoConnectionLabel?: string;
}) {
  const { t, locale } = useI18n();
  const [english, setEnglish] = useState(false);
  const tc = translator(english ? 'en' : locale);
  const [photoOpen, setPhotoOpen] = useState(false);
  const translation = sourceProfile.extras?.english;
  const profile = english
    ? {
        ...sourceProfile,
        title: translation?.title || sourceProfile.title,
        bio: translation?.bio || sourceProfile.bio,
        business: sourceProfile.business
          ? {
              ...sourceProfile.business,
              hours: translation?.hours || sourceProfile.business.hours,
            }
          : undefined,
      }
    : sourceProfile;
  const [message, setMessage] = useState(''),
    [qr, setQr] = useState(''),
    [qrOpen, setQrOpen] = useState(false),
    [qrBusy, setQrBusy] = useState(false);
  const measurement = useProfileEngagement(
    profile.username,
    published && !preview && measure,
  );
  const business = profile.business;
  const whatsapp = whatsappURL(business);
  const Heading = preview ? 'h2' : 'h1';
  const links = [
    ...(profile.links ?? []).map((link, index) => ({
      ...link,
      target: `link:${index}`,
    })),
    ...(profile.email && profile.showEmail
      ? [{ target: 'email', label: 'Email', url: `mailto:${profile.email}` }]
      : []),
    ...(profile.phone && profile.showPhone
      ? [
          {
            target: 'phone',
            label: 'Telefone',
            url: `tel:${profile.phone.replace(/[^+0-9]/g, '')}`,
          },
        ]
      : []),
    ...(profile.website
      ? [{ target: 'website', label: 'Website', url: profile.website }]
      : []),
  ];
  function profileUrl() {
    return new URL(`/${profile.username}`, window.location.origin).href;
  }
  function download() {
    measurement.record('contact');
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
        setMessage('A partilha não está disponível neste navegador.');
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError'))
        setMessage('Não foi possível partilhar o perfil.');
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
    <div
      className="mobile-profile-frame"
      data-accent={business?.accent ?? 'orange'}
      data-tone={
        profileColorIsLight(business?.accent) ? 'light' : 'dark'
      }
      style={
        {
          '--profile-accent': profileColorHex(business?.accent),
          ...(profile.photoShapeColor ? { '--portrait-fill': profile.photoShapeColor } : {}),
          ...(profile.photoGlowColor ? { '--studio-glow': profile.photoGlowColor } : {}),
        } as CSSProperties
      }
      data-layout={business?.layout ?? 'portrait'}
      data-presentation="studio"
    >
      <article className="mobile-identity-page">
        <div className="mobile-profile-body">
          <header className="studio-hero">
            <div className="studio-portrait-stage" data-head-escape={!!profile.photoCutout && profile.photoHeadEscape !== false} style={{ '--portrait-glow-strength': `${(profile.photoGlowStrength ?? 32)}%` } as CSSProperties}>
              <PortraitBackground className="studio-portrait-shape" shape={profile.photoShape} pattern={profile.photoPattern}
                color={profile.photoShapeColor} ink={profile.photoPatternColor} scale={profile.photoPatternScale} strength={profile.photoPatternStrength} />
              <div
                className="mobile-portrait"
                data-cutout={profile.photoCutout ? 'true' : 'false'}
                style={{ maskImage: portraitMask(profile.photoShape, !!profile.photoCutout && profile.photoHeadEscape !== false) }}
              >
                {profile.photoUrl ? (
                  <Image
                    src={profile.photoUrl}
                    alt={
                      profile.name
                        ? t('Fotografia de {0}', [profile.name])
                        : t('Fotografia de perfil')
                    }
                    fill
                    unoptimized
                    sizes="(max-width: 600px) 100vw, 500px"
                    style={{
                      objectFit: profile.photoCutout ? 'contain' : 'cover',
                      objectPosition: `${profile.photoPositionX ?? 50}% 35%`,
                      transformOrigin: `${profile.photoPositionX ?? 50}% bottom`,
                      transform: `translateY(${((profile.photoPosition ?? 35) - 35) * 0.6}%) scale(${(profile.photoScale ?? 100) / 100})`,
                    }}
                  />
                ) : (
                  <div className="mobile-photo-placeholder">
                    <Camera />
                    <span>{t('A sua fotografia aparece aqui')}</span>
                  </div>
                )}
              </div>
              <svg className="studio-portrait-outline" viewBox="0 0 420 440" aria-hidden="true">
                <path d={portraitPath(profile.photoShape)} style={{ fill: 'none', stroke: profile.photoOutlineColor ?? 'var(--portrait-outline-color, #ffffffbd)', strokeWidth: profile.photoOutlineWidth ?? 3 }} />
              </svg>
              {profile.photoUrl && (
                <button type="button" className="studio-portrait-expand"
                  aria-label={t('Fotografia de {0}', [profile.name])}
                  aria-haspopup="dialog" onClick={() => setPhotoOpen(true)} />
              )}
              <ProfileConnectionCount
                demoLabel={demoConnectionLabel}
                username={profile.username}
                enabled={published && !preview}
                preview={preview || !published}
              />
            </div>
            <div className="studio-intro">
              <Heading>{profile.name || t('O seu nome')}</Heading>
              <p className="mobile-profile-title">
                {profile.title || t('O seu título ou profissão')}
              </p>
              {profile.bio && (
                <p className="mobile-profile-bio">{profile.bio}</p>
              )}
            </div>
              <div className="studio-contact-actions">
                <button
                  type="button"
                  className="studio-save-contact"
                  disabled={!profile.name}
                  onClick={download}
                  aria-label={tc('Guardar contacto')}
                  title={tc('Guardar contacto')}
                >
                  <UserRoundPlus size={20} aria-hidden="true" />
                </button>
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => measurement.record('whatsapp')}
                    aria-label={t('WhatsApp')}
                    title={t('WhatsApp')}
                  >
                    <MessageCircle size={20} aria-hidden="true" />
                  </a>
                )}
              {(translation?.title ||
                translation?.bio ||
                translation?.hours ||
                profile.extras?.services.some(
                  (s) =>
                    s.englishTitle || s.englishDescription || s.englishPrice,
                )) && (
                <nav
                  className="profile-content-languages"
                  aria-label={tc('Idioma do conteúdo')}
                >
                  <button
                    type="button"
                    aria-label={english ? tc('Mudar para português') : tc('Mudar para inglês')}
                    onClick={() => setEnglish((value) => !value)}
                  >
                    <Languages size={20} aria-hidden="true" />
                  </button>
                </nav>
              )}
              </div>
          </header>
          {(business?.address || business?.hours) && (
            <section
              className="public-business"
              aria-label={t('Informações do negócio')}
            >
              {business?.hours && (
                <p>
                  <strong>
                    {tc('Horário de atendimento')}
                  </strong>
                  <span>{business.hours}</span>
                </p>
              )}
              {business?.address && (
                <p>
                  <strong>
                    {tc('Endereço do negócio')}
                  </strong>
                  <span>{business.address}</span>
                  <a
                    href={directionsURL(business.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => measurement.record('directions')}
                  >
                    {tc('Como chegar')} ↗
                  </a>
                </p>
              )}
            </section>
          )}
          <nav
            className="mobile-profile-links"
            aria-label={t('Links do perfil — deslize para ver mais')}
          >
            {links.map((link, index) => (
              <a
                key={index}
                onClick={() => measurement.record(link.target)}
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
                <span>{tc(link.label) || t('Título do link')}</span>
              </a>
            ))}
            {!links.length && preview && (
              <p className="mobile-links-placeholder">
                {t('Adicione os seus links no editor.')}
              </p>
            )}
          </nav>
          <ProfilePublicExtras
            profile={profile}
            english={english}
            preview={preview || !published}
            onAction={measurement.record}
          />
          <div className="mobile-profile-actions">
            <button
              type="button"
              aria-label={tc('Adicionar aos contactos')}
              title={tc('Adicionar aos contactos')}
              disabled={!profile.name}
              onClick={download}
            >
              <UserRoundPlus />
            </button>
            <button
              type="button"
              aria-label={tc('Mostrar QR do perfil')}
              title={
                published
                  ? tc('Mostrar QR do perfil')
                  : t('Publique o perfil para activar o QR')
              }
              disabled={!published || qrBusy}
              onClick={showQr}
            >
              <QrCode />
            </button>
            {!preview && (
              <button
                type="button"
                aria-label={tc('Partilhar perfil')}
                title={
                  published
                    ? tc('Partilhar perfil')
                    : t('Publique o perfil para partilhar')
                }
                disabled={!published}
                onClick={share}
              >
                <Share2 />
              </button>
            )}
          </div>
          {message && (
            <output className="mobile-profile-message">{t(message)}</output>
          )}
          {!preview && published && measure && (
            <ProfileMeasurementChoice
              english={english}
              consent={measurement.consent}
              choose={measurement.choose}
            />
          )}
          <footer className="mobile-profile-footer">
            <div className="mobile-profile-wave" aria-hidden="true" />
            <a
              href={brandHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(
                'Visitar o site Framy Connect (abre num novo separador)',
              )}
            >
              <Image
                src="/brand/logo.svg"
                alt={t('Framy Connect')}
                width={220}
                height={100}
                unoptimized
              />
            </a>
            <small>
              {t('Todos direitos reservados ')}
              {new Date().getFullYear()}
            </small>
          </footer>
        </div>
      </article>
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="profile-photo-dialog">
          <DialogTitle className="sr-only">{t('Fotografia de {0}', [profile.name])}</DialogTitle>
          {profile.photoUrl && <Image src={profile.photoUrl} alt={t('Fotografia de {0}', [profile.name])}
            width={1000} height={1000} unoptimized />}
        </DialogContent>
      </Dialog>
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="profile-qr-dialog">
          <DialogTitle>{t('O seu QR Framy')}</DialogTitle>
          <DialogDescription>
            {t('Digitalize para abrir o perfil publicado.')}
          </DialogDescription>
          {qr && (
            <Image
              src={qr}
              alt={t('QR do perfil {0}', [profile.name])}
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
