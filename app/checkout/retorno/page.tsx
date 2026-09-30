import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { PaySuiteStatus } from '@/components/paysuite-status';
export const metadata = {
  title: 'Estado do pagamento',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <SiteHeader focused />
      <main id="main" className="section-wrap">
        <PaySuiteStatus />
      </main>
      <SiteFooter />
    </>
  );
}
