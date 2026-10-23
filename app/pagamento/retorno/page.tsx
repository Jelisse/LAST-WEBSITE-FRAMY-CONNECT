import { SiteHeader } from '@/components/site-shell';
import { PaymentReturn } from '@/components/payment-return';
import { getTranslations } from '@/lib/server-i18n';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Framy Connect — Pagamento'),
    robots: { index: false, follow: false },
  };
}
export default function Page() {
  return (
    <>
      <SiteHeader focused />
      <main
        id="main"
        style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}
      >
        <PaymentReturn />
      </main>
    </>
  );
}
