import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { CorporateDashboard } from '@/components/corporate-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Campanhas e eventos | Framy Connect',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ organisation?: string; campaign?: string }>;
}) {
  await requireChatGPTUser('/corporativo/campanhas');
  const query = await searchParams;
  return (
    <CorporateDashboard
      view="campaigns"
      initialOrganisation={
        typeof query.organisation === 'string' ? query.organisation : ''
      }
      initialCampaign={typeof query.campaign === 'string' ? query.campaign : ''}
    />
  );
}
