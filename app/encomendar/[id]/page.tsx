import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getProducts } from '@/lib/server-catalog';
import { getManagedPlans } from '@/lib/server-plans';
import { publicProduct } from '@/lib/catalog';
import { notFound } from 'next/navigation';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { OrderSubmission } from '@/components/order-submission';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Submeter pedido',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getChatGPTUser();
  const product = (await getProducts()).find((p) => p.id === id && p.available);
  if (!product) notFound();
  return (
    <>
      <SiteHeader />
      <main id="main" className="order-submission">
        <OrderSubmission
          product={publicProduct(product)}
          plans={(await getManagedPlans()).filter((p) => p.active)}
          account={user ? { id: user.userId, name: user.displayName } : null}
        />
      </main>
      <SiteFooter />
    </>
  );
}
