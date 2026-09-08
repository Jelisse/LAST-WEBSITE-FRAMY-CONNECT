import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { Workspace } from '@/components/workspace';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Minha Conta',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await requireChatGPTUser('/dashboard');
  return <Workspace displayName={user.fullName ?? 'Olá'} />;
}
