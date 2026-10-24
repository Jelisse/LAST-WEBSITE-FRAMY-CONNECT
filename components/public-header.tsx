import { CircleHelp } from 'lucide-react';
import { PublicNavigation } from './public-navigation';
import Image from 'next/image';
import Link from './hard-link';
import { AccountMenu } from './account-menu';
import { LanguageSelector } from './language-provider';
import { HomeMobileMenu } from './home-mobile-menu';
import { getTranslations } from '@/lib/server-i18n';

export async function PublicHeader({
  company = false,
  why = false,
  focused = false,
  hideAccount = false,
}: {
  company?: boolean;
  why?: boolean;
  help?: boolean;
  focused?: boolean;
  hideAccount?: boolean;
}) {
  const t = await getTranslations();
  return (
    <header
      className={'public-header' + (focused ? ' public-header-focused' : '')}
    >
      <Link
        href="/"
        className="public-logo"
        aria-label={t('Framy Connect — início')}
      >
        <Image
          src="/brand/logo.svg"
          alt="Framy Connect"
          width={150}
          height={55}
          unoptimized
          priority
        />
      </Link>
      {!focused && <PublicNavigation company={company} why={why} />}
      <div className="public-header-actions">
        <LanguageSelector />
        {!hideAccount && <AccountMenu />}
        {!focused && <HomeMobileMenu />}
        {focused && (
          <Link
            className="focused-help"
            href="/ajuda"
            aria-label={t('Centro de ajuda')}
          >
            <CircleHelp size={18} aria-hidden="true" />
            <span>{t('Centro de ajuda')}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
