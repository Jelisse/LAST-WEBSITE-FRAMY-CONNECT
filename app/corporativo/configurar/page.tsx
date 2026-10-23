import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getProducts } from '@/lib/server-catalog';
import { CorporateSetup } from '@/components/corporate-setup';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Configurar empresa | Framy Connect',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string }>;
}) {
  const requested = (await searchParams).offer;
  const offer = requested === 'enterprise' ? 'enterprise' : 'business';
  await requireChatGPTUser(`/corporativo/configurar?offer=${offer}`);
  const products = (await getProducts())
    .filter((p) => p.published !== false && p.available)
    .map(({ id, name }) => ({ id, name }));
  return <CorporateSetup products={products} initialOffer={offer} />;
}
