import { StaffSidebar } from '@/components/staff-sidebar';
import { DashboardTools } from '@/components/mobile-navigation';
import { redirect } from 'next/navigation';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { PaySuiteManager } from '@/components/paysuite-manager';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager') redirect('/entrar');
  return (
    <div className="staff-role-shell">
      <StaffSidebar area="manager" />
      <main id="main" className="section-wrap">
        <DashboardTools navigation={null} />
        <PaySuiteManager />
      </main>
    </div>
  );
}
