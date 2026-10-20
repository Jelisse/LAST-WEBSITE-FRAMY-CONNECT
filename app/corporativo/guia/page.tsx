import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { CorporateDashboard } from '@/components/corporate-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Guia da equipa corporativa | Framy Connect',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ organisation?: string; campaign?: string }>;
}) {
  await requireChatGPTUser('/corporativo/guia');
  const query = await searchParams;
  return (
    <CorporateDashboard
      view="guide"
      initialOrganisation={
        typeof query.organisation === 'string' ? query.organisation : ''
      }
      initialCampaign={typeof query.campaign === 'string' ? query.campaign : ''}
    />
  );
}
