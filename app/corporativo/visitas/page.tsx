import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { CorporateDashboard } from '@/components/corporate-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Livro de Visitas Digital',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ organisation?: string }>;
}) {
  await requireChatGPTUser('/corporativo/visitas');
  const q = await searchParams;
  return (
    <CorporateDashboard
      view="visitors"
      initialOrganisation={
        typeof q.organisation === 'string' ? q.organisation : ''
      }
    />
  );
}
