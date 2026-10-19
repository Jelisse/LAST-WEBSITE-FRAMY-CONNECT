import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { CorporateSetup } from '@/components/corporate-setup';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Configurar empresa | Framy Connect',
  robots: { index: false, follow: false },
};
export default async function Page() {
  await requireChatGPTUser('/corporativo/configurar');
  return <CorporateSetup />;
}
