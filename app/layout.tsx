import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import './footer.css';
const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: {
    default: 'Framy Connect — O Seu Mundo, Num Toque.',
    template: '%s | Framy Connect',
  },
  description:
    'A sua identidade, as suas ligações e o seu trabalho. Descubra os produtos NFC da Framy Connect, feitos para conectar Moçambique.',
  metadataBase: new URL('https://framy-connect.codex5729.chatgpt.site'),
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-MZ">
      <body className={poppins.variable}>
        <a className="skip-link" href="#main">
          Saltar para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
