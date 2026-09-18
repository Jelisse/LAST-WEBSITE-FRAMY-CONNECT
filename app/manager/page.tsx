import { getTranslations } from '@/lib/server-i18n';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { ManagerWorkspace } from '@/components/manager-workspace';
import { canManageOrders } from '@/lib/server-order-access';
import Link from '@/components/hard-link';
import './manager.css';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Gestor'),
    robots: { index: false, follow: false },
  };
}
export default async function Page() {
  const t = await getTranslations();
  const user = await requireChatGPTUser('/manager');
  if (!(await canManageOrders(user.userId)))
    return (
      <main className="manager-main">
        <h1>{t('Acesso reservado')}</h1>
        <p>{t('Esta conta não tem acesso ao Gestor.')}</p>
        <Link href="/dashboard">{t('Abrir a minha conta')}</Link>
      </main>
    );
  return <ManagerWorkspace displayName={user.fullName ?? 'Gestor'} />;
}
