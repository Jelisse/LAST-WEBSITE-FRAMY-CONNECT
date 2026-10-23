import { SiteHeader } from '@/components/site-shell';
import { OrderTracking } from '@/components/order-tracking';
import { getTranslations } from '@/lib/server-i18n';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Acompanhar a minha encomenda'),
    robots: { index: false, follow: false },
  };
}
export default function Page() {
  return (
    <>
      <SiteHeader focused />
      <main id="main" className="section-wrap">
        <OrderTracking />
      </main>
    </>
  );
}
