import { getTranslations } from '@/lib/server-i18n';
import type { Metadata } from 'next';
import { siteURL } from '@/lib/server-site';
import { Poppins } from 'next/font/google';
import { getLocale } from '@/lib/server-i18n';
import { LanguageProvider } from '@/components/language-provider';
import './globals.css';
import './footer.css';
import './products.css';
import './mobile-dashboard.css';
const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    icons: { icon: '/favicon.svg' },
    title: {
      default: t('Framy Connect — O Seu Mundo, Num Toque.'),
      template: '%s | Framy Connect',
    },
    description: t(
      'A sua identidade, as suas ligações e o seu trabalho. Descubra os produtos NFC da Framy Connect, feitos para conectar Moçambique.',
    ),
    metadataBase: siteURL() ?? undefined,
    robots: { index: false, follow: false },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={poppins.variable}>
        <a className="skip-link" href="#main">
          {t('Saltar para o conteúdo')}
        </a>
        <LanguageProvider locale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
