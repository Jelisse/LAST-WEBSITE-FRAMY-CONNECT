import { getTranslations } from '@/lib/server-i18n';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { CorporateDashboard } from '@/components/corporate-dashboard';
export const dynamic = 'force-dynamic';
export async function generateMetadata(){const t=await getTranslations();return {title:t('Contactos recebidos'),robots:{index:false,follow:false}};}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ organisation?: string; campaign?: string }>;
}) {
  await requireChatGPTUser('/corporativo/contactos');
  const query = await searchParams;
  return (
    <CorporateDashboard
      view="contacts"
      initialOrganisation={
        typeof query.organisation === 'string' ? query.organisation : ''
      }
      initialCampaign={typeof query.campaign === 'string' ? query.campaign : ''}
    />
  );
}
