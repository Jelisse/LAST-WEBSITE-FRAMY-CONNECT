import type { ReactNode } from 'react';
import { getTranslations } from '@/lib/server-i18n';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Recuperar acesso | Framy Connect'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
