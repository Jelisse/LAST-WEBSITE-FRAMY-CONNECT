import { getTranslations } from '@/lib/server-i18n';
import { LanguageSelector } from '@/components/language-provider';
import { MobileNavigation } from '@/components/mobile-navigation';
import { AccountMenu } from '@/components/account-menu';
import Image from 'next/image';
import Link from '@/components/hard-link';
import { ArrowUpRight, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
export async function SiteHeader({ focused = false }: { focused?: boolean }) {
  const t = await getTranslations();
  return (
    <header className={`site-header${focused ? ' site-header-focused' : ''}`}>
      <Link href="/" className="brand">
        <Image
          width={220}
          height={100}
          unoptimized
          src="/brand/logo.svg"
          alt={t('Framy Connect')}
        />
      </Link>
      {!focused && (
        <nav aria-label={t('Navegação principal')}>
          <Link href="/">{t('Página Inicial')}</Link>
          <Link href="/sobre">{t('Sobre nós')}</Link>
          <Link href="/produtos">{t('Produtos')}</Link>
          <Link href="/contacto">{t('Contacto')}</Link>
        </nav>
      )}
      <div className="header-actions">
        <LanguageSelector />
        {!focused && (
          <Link className="header-agent-link" href="/aplicar">
            {t('Tornar-se agente')}
          </Link>
        )}
        <AccountMenu />
        <MobileNavigation />
        {focused && (
          <Link className="header-contact-link" href="/contacto">
            {t('Contacto')}
          </Link>
        )}
      </div>
    </header>
  );
}
export async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="brand-footer">
      <div className="brand-footer-inner">
        <div className="brand-footer-grid">
          <div className="brand-footer-about">
            <Link href="/" aria-label={t('Framy Connect — início')}>
              <Image
                src="/brand/logo.svg"
                alt={t('Framy Connect')}
                width={220}
                height={100}
                unoptimized
              />
            </Link>
            <p>
              {t(
                'A sua identidade, os seus contactos e o seu trabalho. Tudo ligado, num único toque.',
              )}
            </p>
            <p className="brand-footer-tagline">
              {t('O Seu Mundo num Toque.')}
            </p>
          </div>
          <nav aria-label={t('Navegação do rodapé')}>
            <h2>{t('Navegação')}</h2>
            <Link href="/">{t('Página Inicial')}</Link>
            <Link href="/sobre">{t('Sobre nós')}</Link>
            <Link href="/produtos">{t('Produtos')}</Link>
            <Link href="/contacto">{t('Contacto')}</Link>
            <Link href="/aplicar">{t('Torne-se agente')}</Link>
          </nav>
          <div className="brand-footer-contact">
            <h2>{t('Fale connosco')}</h2>
            <a href="mailto:info@framyconnect.co.mz">
              <Mail size={16} />
              <span>
                <small>{t('Produtos e soluções')}</small>
                {t('info@framyconnect.co.mz')}
              </span>
            </a>
            <a href="https://wa.me/258846847629" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} aria-hidden="true" />
              <span>
                <small>{t('WhatsApp')}</small>
                +258 84 684 7629
              </span>
            </a>
            <Link className="brand-footer-pill" href="/contacto">
              {t('Vamos conversar ')}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <nav aria-label={t('Conta e apoio')}>
            <h2>{t('A sua Framy')}</h2>
            <Link href="/dashboard">{t('Minha Conta')}</Link>
            <Link href="/perfil">{t('A minha identidade')}</Link>
            <Link href="/ajuda">{t('Centro de ajuda')}</Link>
            <Link className="brand-footer-pill" href="/privacidade">
              <ShieldCheck size={15} />
              {t('Privacidade')}
            </Link>
          </nav>
        </div>
        <div className="brand-footer-bottom">
          <span>
            © {new Date().getFullYear()}
            {t(' Framy Connect. Todos os direitos reservados.')}
          </span>
          <div>
            <Link href="/privacidade">{t('Política de privacidade')}</Link>
            <Link href="/termos">{t('Termos de utilização')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
