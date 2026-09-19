import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { PaymentReturn } from '@/components/payment-return';
export const metadata = { title: 'Framy Connect — Pagamento', robots: { index: false, follow: false } };
export default function Page() {
  return <><SiteHeader /><main id="main" style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}><PaymentReturn /></main><SiteFooter /></>;
}
