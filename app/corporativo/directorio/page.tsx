import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getTranslations } from '@/lib/server-i18n';
import { CorporateDashboard } from '@/components/corporate-dashboard';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Directório da empresa'),
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ organisation?: string }>;
}) {
  await requireChatGPTUser('/corporativo/directorio');
  const query = await searchParams;
  return (
    <CorporateDashboard
      view="directory"
      initialOrganisation={
        typeof query.organisation === 'string' ? query.organisation : ''
      }
    />
  );
}
