import { PublicHeader } from './public-header';
import { getTranslations } from '@/lib/server-i18n';
import Image from 'next/image';
import Link from '@/components/hard-link';
import { Mail, MessageCircle } from 'lucide-react';
import { AnalyticsPreferencesLink } from './analytics-preferences-link';
export async function SiteHeader({ focused = false }: { focused?: boolean }) {
  return <PublicHeader focused={focused} />;
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
            <p>{t('A sua identidade e as suas conexões, num só lugar.')}</p>
            <p className="brand-footer-tagline">
              {t('O Seu Mundo num Toque.')}
            </p>
          </div>
          <nav aria-label={t('Explorar')}>
            <h2>{t('Explorar')}</h2>
            <Link href="/porque-framy">{t('Porquê Framy Connect')}</Link>
            <Link href="/produtos">{t('Produtos')}</Link>
            <Link href="/#planos">{t('Planos')}</Link>
            <Link href="/para-empresas">{t('Para empresas')}</Link>
            <Link href="/sobre">{t('Sobre nós')}</Link>
          </nav>
          <nav aria-label={t('Apoio')}>
            <h2>{t('Apoio')}</h2>
            <Link href="/ajuda">{t('Centro de ajuda')}</Link>
            <Link href="/contacto">{t('Contactar a Framy')}</Link>
            <Link href="/acompanhar">{t('Acompanhar encomenda')}</Link>
          </nav>
          <div className="brand-footer-contact">
            <h2>{t('Conectar')}</h2>
            <a href="mailto:sales@framyconnect.co.mz">
              <Mail size={16} aria-hidden="true" />
              <span>sales@framyconnect.co.mz</span>
            </a>
            <a
              href="https://wa.me/258846847629"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={16} aria-hidden="true" />
              <span>+258 84 684 7629</span>
            </a>
            <Link href="/aplicar">{t('Torne-se agente')}</Link>
            <Link href="/embaixadores">{t('Embaixadores Framy')}</Link>
          </div>
        </div>
        <div className="brand-footer-bottom">
          <span>
            © {new Date().getFullYear()}
            {t(' Framy Connect. Todos os direitos reservados.')}
          </span>
          <div>
            <Link href="/privacidade">{t('Política de privacidade')}</Link>
            <Link href="/termos">{t('Termos de utilização')}</Link>
            <AnalyticsPreferencesLink />
          </div>
        </div>
      </div>
    </footer>
  );
}
