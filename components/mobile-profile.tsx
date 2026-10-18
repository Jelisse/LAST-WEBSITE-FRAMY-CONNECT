'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The links panel must be keyboard-focusable so visitors can scroll it independently of the fixed header and footer. */
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Camera,
  Languages,
  Globe2,
  Mail,
  Phone,
  QrCode,
  Share2,
  UserRoundPlus,
  ArrowUpRight,
  UserRound,
  MessageCircle,
  Clock3,
  MapPin,
} from 'lucide-react';
import { LanguageProvider, useI18n } from './language-provider';
import { ProfilePublicExtras } from './profile-public-extras';
import { ProfileConnectionCount } from './profile-connection-count';
import { useProfileEngagement } from './profile-engagement';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  profileTheme,
  whatsappURL,
  directionsURL,
} from '@/lib/profile-business';
import { profileInLanguage, type ProfileLanguage } from '@/lib/profile-locales';
import { socialPlatform } from '@/lib/social-platform';
import type { Profile } from '@/lib/domain';

function SocialIcon({ url }: { url: string }) {
  const brand = socialPlatform(url);
  if (brand)
    return (
      <Image
        src={`/social/${brand}.svg`}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="mobile-social-icon"
      />
    );
  if (url.startsWith('mailto:')) return <Mail aria-hidden="true" />;
  if (url.startsWith('tel:')) return <Phone aria-hidden="true" />;
  return <Globe2 aria-hidden="true" />;
}
const escapeVcf = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
export function MobileProfile(props: {
  profile: Profile;
  published?: boolean;
  preview?: boolean;
  brandHref?: string;
  measure?: boolean;
  demoConnectionLabel?: string;
}) {
  const [language, setLanguage] = useState<ProfileLanguage>('en');
  return (
    <LanguageProvider locale={language}>
      <PortfolioProfile
        {...props}
        language={language}
        setLanguage={setLanguage}
      />
    </LanguageProvider>
  );
}
function PortfolioProfile({
  profile: source,
  published = false,
  preview = false,
  brandHref = '/',
  measure = true,
  demoConnectionLabel,
  language,
  setLanguage,
}: {
  profile: Profile;
  published?: boolean;
  preview?: boolean;
  brandHref?: string;
  measure?: boolean;
  demoConnectionLabel?: string;
  language: ProfileLanguage;
  setLanguage: (value: ProfileLanguage) => void;
}) {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The public page's consent controls follow its language too. Editor and
    // homepage previews never change the surrounding application's language.
    if (!root.current?.closest('.standalone-mobile-profile')) return;
    const frame = requestAnimationFrame(() =>
      window.dispatchEvent(
        new CustomEvent('framy-profile-language', { detail: language }),
      ),
    );
    return () => cancelAnimationFrame(frame);
  }, [language]);
  const { profile, missing } = profileInLanguage(source, language);
  const theme = profileTheme(profile.business?.accent);
  const [photoOpen, setPhotoOpen] = useState(false),
    [bioOpen, setBioOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [message, setMessage] = useState(''),
    [qr, setQr] = useState(''),
    [qrOpen, setQrOpen] = useState(false),
    [qrBusy, setQrBusy] = useState(false);
  const measurement = useProfileEngagement(
    profile.username,
    published && !preview && measure,
  );
  const Heading = preview ? 'h2' : 'h1';
  const whatsapp = whatsappURL(profile.business);
  const links = [
    ...(profile.links ?? []).map((link, index) => ({
      ...link,
      target: `link:${index}`,
    })),
    ...(profile.email && profile.showEmail
      ? [{ target: 'email', label: t('Email'), url: `mailto:${profile.email}` }]
      : []),
    ...(profile.phone && profile.showPhone
      ? [
          {
            target: 'phone',
            label: t('Telefone'),
            url: `tel:${profile.phone.replace(/[^+0-9]/g, '')}`,
          },
        ]
      : []),
    ...(profile.website
      ? [{ target: 'website', label: t('Website'), url: profile.website }]
      : []),
    ...(whatsapp
      ? [{ target: 'whatsapp', label: 'WhatsApp', url: whatsapp }]
      : []),
  ];
  const profileUrl = () =>
    new URL(`/${profile.username}`, window.location.origin).href;
  function download() {
    measurement.record('contact');
    const values = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${escapeVcf(source.name)}`,
      `TITLE:${escapeVcf(profile.title)}`,
      ...(source.showEmail && source.email
        ? [`EMAIL:${escapeVcf(source.email)}`]
        : []),
      ...(source.showPhone && source.phone
        ? [`TEL:${escapeVcf(source.phone)}`]
        : []),
      ...(source.website ? [`URL:${escapeVcf(source.website)}`] : []),
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
      else setShareOpen(true);
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
      ref={root}
      className="mobile-profile-frame"
      data-presentation="portfolio"
      data-theme={theme.value}
      lang={language}
      style={
        {
          '--portfolio-paper': theme.hex,
          '--portfolio-ink': theme.ink,
          '--portfolio-muted': theme.muted,
          '--portfolio-accent': theme.accent,
        } as CSSProperties
      }
    >
      <article className="mobile-identity-page">
        <div className="mobile-profile-body">
          <header className="portfolio-header">
            <div className="portfolio-cover" aria-hidden="true">
              {(profile.coverUrl || profile.photoUrl) && (
                <Image
                  src={profile.coverUrl || profile.photoUrl!}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 600px) 100vw, 480px"
                  style={{
                    objectFit: 'cover',
                    objectPosition: `50% ${profile.coverPosition ?? 35}%`,
                  }}
                />
              )}
            </div>
            <div className="portfolio-language">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="portfolio-language-trigger"
                  aria-label={t('Idioma do conteúdo')}
                >
                  <Languages size={21} aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="portfolio-language-menu"
                >
                  <DropdownMenuRadioGroup
                    value={language}
                    onValueChange={(value) =>
                      setLanguage(value as ProfileLanguage)
                    }
                  >
                    {Object.entries({
                      en: 'English',
                      'pt-MZ': 'Português',
                      'zh-Hant': '繁體中文',
                      uk: 'Українська',
                      pl: 'Polski',
                      fr: 'Français',
                      'zh-Hans': '简体中文',
                    }).map(([value, name]) => (
                      <DropdownMenuRadioItem
                        closeOnClick
                        key={value}
                        value={value}
                        lang={value}
                      >
                        {name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="portfolio-identity">
              <div className="portfolio-portrait-wrap">
                <button
                  className="portfolio-portrait"
                  type="button"
                  disabled={!profile.photoUrl}
                  aria-haspopup="dialog"
                  aria-label={t('Fotografia de {0}', [profile.name])}
                  onClick={() => setPhotoOpen(true)}
                >
                  {profile.photoUrl ? (
                    <Image
                      src={profile.photoUrl}
                      alt={t('Fotografia de {0}', [profile.name])}
                      fill
                      unoptimized
                      sizes="140px"
                      style={{
                        objectFit: 'cover',
                        objectPosition: `${profile.photoPositionX ?? 50}% ${profile.photoPosition ?? 50}%`,
                        transform: `scale(${Math.max(100, profile.photoScale ?? 100) / 100})`,
                      }}
                    />
                  ) : (
                    <Camera aria-hidden="true" />
                  )}
                </button>
                <ProfileConnectionCount
                  demoLabel={demoConnectionLabel}
                  username={profile.username}
                  enabled={published && !preview}
                  preview={preview || !published}
                />
              </div>
              <Heading
                className="portfolio-name"
                title={profile.name}
                data-long-name={profile.name.length > 32}
                data-cjk={/\p{Script=Han}/u.test(profile.name)}
              >
                {profile.name || t('O seu nome')}
              </Heading>
              <p className="portfolio-profession">
                {profile.title ||
                  (preview ? t('O seu título ou profissão') : '')}
              </p>
            </div>
          </header>
          <section
            className="portfolio-scroll"
            tabIndex={0}
            aria-label={t('Links do perfil — deslize para ver mais')}
          >
            <nav
              className="mobile-profile-links"
              aria-label={t('Links do perfil — deslize para ver mais')}
            >
              {profile.bio && (
                <button
                  type="button"
                  className="portfolio-link"
                  aria-haspopup="dialog"
                  onClick={() => setBioOpen(true)}
                >
                  <UserRound aria-hidden="true" />
                  <span>{t('Sobre mim')}</span>
                  <ArrowUpRight aria-hidden="true" />
                </button>
              )}
              {links.map((link, i) => (
                <a
                  key={`${link.target}-${i}`}
                  className="portfolio-link"
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
                  {link.target === 'whatsapp' ? (
                    <MessageCircle aria-hidden="true" />
                  ) : (
                    <SocialIcon url={link.url} />
                  )}
                  <span>{t(link.label) || t('Título do link')}</span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
              {!links.length && preview && (
                <p className="mobile-links-placeholder">
                  {t('Adicione os seus links no editor.')}
                </p>
              )}
            </nav>
            {(profile.business?.address || profile.business?.hours) && (
              <section
                className="portfolio-business"
                aria-label={t('Informações do negócio')}
              >
                {profile.business.hours && (
                  <p>
                    <Clock3 size={16} aria-hidden="true" />
                    <span>
                      <strong>{t('Horário de atendimento')}</strong>
                      {profile.business.hours}
                    </span>
                  </p>
                )}
                {profile.business.address && (
                  <p>
                    <MapPin size={16} aria-hidden="true" />
                    <span>
                      <strong>{t('Endereço do negócio')}</strong>
                      {profile.business.address}
                      <a
                        href={directionsURL(profile.business.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => measurement.record('directions')}
                      >
                        {t('Como chegar')} ↗
                      </a>
                    </span>
                  </p>
                )}
              </section>
            )}
            <ProfilePublicExtras
              profile={profile}
              english={false}
              preview={preview || !published}
              onAction={measurement.record}
            />
            {missing && (
              <p className="portfolio-translation-note">
                {t('Alguns conteúdos são apresentados no idioma original.')}
              </p>
            )}
          </section>
          <footer className="portfolio-dock">
            <div className="mobile-profile-wave" aria-hidden="true" />
            <div className="mobile-profile-actions">
              <button
                type="button"
                disabled={!profile.name}
                onClick={download}
                aria-label={t('Adicionar aos contactos')}
              >
                <UserRoundPlus aria-hidden="true" />
                <span>{t('Adicionar contacto')}</span>
              </button>
              <button
                type="button"
                disabled={!published || qrBusy}
                onClick={showQr}
                aria-label={t('Mostrar QR do perfil')}
              >
                <QrCode aria-hidden="true" />
                <span>{t('Código QR')}</span>
              </button>
              <button
                type="button"
                disabled={!published}
                onClick={share}
                aria-label={t('Partilhar perfil')}
              >
                <Share2 aria-hidden="true" />
                <span>{t('Partilhar')}</span>
              </button>
            </div>
            {message && (
              <output className="mobile-profile-message">{t(message)}</output>
            )}
            <a
              className="portfolio-brand"
              href={brandHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(
                'Visitar o site Framy Connect (abre num novo separador)',
              )}
            >
              <Image
                src="/brand/logo.svg"
                alt="Framy Connect"
                width={140}
                height={60}
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
      <Dialog open={bioOpen} onOpenChange={setBioOpen}>
        <DialogContent className="portfolio-bio-dialog" lang={language}>
          <DialogTitle>{t('Sobre mim')}</DialogTitle>
          <DialogDescription>{profile.name}</DialogDescription>
          <p>{profile.bio}</p>
        </DialogContent>
      </Dialog>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="portfolio-bio-dialog" lang={language}>
          <DialogTitle>{t('Partilhar perfil')}</DialogTitle>
          <DialogDescription>
            {t('Copie este link para partilhar o contacto.')}
          </DialogDescription>
          <input
            className="portfolio-share-url"
            aria-label={t('Link do perfil')}
            readOnly
            value={shareOpen ? profileUrl() : ''}
            onFocus={(e) => e.currentTarget.select()}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="profile-photo-dialog" lang={language}>
          <DialogTitle className="sr-only">
            {t('Fotografia de {0}', [profile.name])}
          </DialogTitle>
          {profile.photoUrl && (
            <Image
              src={profile.photoUrl}
              alt={t('Fotografia de {0}', [profile.name])}
              width={1000}
              height={1000}
              unoptimized
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="profile-qr-dialog" lang={language}>
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
