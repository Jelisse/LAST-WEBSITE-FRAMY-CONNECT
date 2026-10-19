import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { CorporateDashboard } from '@/components/corporate-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Equipa corporativa | Framy Connect',
  robots: { index: false, follow: false },
};
export default async function Page() {
  await requireChatGPTUser('/corporativo');
  return <CorporateDashboard />;
}
