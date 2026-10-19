import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getProducts } from '@/lib/server-catalog';
import { CorporateSetup } from '@/components/corporate-setup';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Configurar empresa | Framy Connect',
  robots: { index: false, follow: false },
};
export default async function Page() {
  await requireChatGPTUser('/corporativo/configurar');
  const products = (await getProducts())
    .filter((p) => p.published !== false && p.available)
    .map(({ id, name }) => ({ id, name }));
  return <CorporateSetup products={products} />;
}
