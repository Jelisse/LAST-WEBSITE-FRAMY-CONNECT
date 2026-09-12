import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { ManagerWorkspace } from '@/components/manager-workspace';
import { canManageOrders } from '@/lib/server-order-access';
import Link from '@/components/hard-link';
import './manager.css';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Manager',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await requireChatGPTUser('/manager');
  if (!(await canManageOrders(user.userId)))
    return (
      <main className="manager-main">
        <h1>Acesso reservado</h1>
        <p>Esta conta não tem acesso ao Manager.</p>
        <Link href="/dashboard">Abrir a minha conta</Link>
      </main>
    );
  return <ManagerWorkspace displayName={user.fullName ?? 'Manager'} />;
}
