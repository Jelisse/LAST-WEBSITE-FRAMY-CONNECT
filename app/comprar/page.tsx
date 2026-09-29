import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { PurchaseConfigurator } from '@/components/purchase-configurator';
import { getManagedPlans } from '@/lib/server-plans';
import { getTranslations } from '@/lib/server-i18n';
import { getProducts } from '@/lib/server-catalog';
import { hardwarePrices } from '@/lib/hardware-pricing';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Configurar a sua solução',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ formato?: string }>;
}) {
  const [t, plans, query, products] = await Promise.all([
    getTranslations(),
    getManagedPlans(),
    searchParams,
    getProducts(),
  ]);
  return (
    <>
      <SiteHeader focused />
      <main id="main" className="section-wrap purchase-page">
        <span className="eyebrow">FRAMY CONNECT</span>
        <h1>{t('Uma identidade. Duas formas de se conectar.')}</h1>
        <p className="page-intro">
          {t(
            'Escolha cartão, porta-chaves ou o kit completo, ligados ao mesmo perfil digital.',
          )}
        </p>
        <PurchaseConfigurator
          initial={query.formato}
          plans={plans.filter((plan) => plan.active)}
          prices={hardwarePrices(products)}
        />
      </main>
      <SiteFooter />
    </>
  );
}
