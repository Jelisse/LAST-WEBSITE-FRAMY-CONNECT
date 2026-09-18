import { getTranslations } from '@/lib/server-i18n';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { Workspace } from '@/components/workspace';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Minha Conta'),
    robots: { index: false, follow: false },
  };
}
export default async function Page() {
  const user = await requireChatGPTUser('/dashboard');
  return <Workspace displayName={user.fullName ?? 'Olá'} />;
}
