import { redirect } from 'next/navigation';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { PaySuiteManager } from '@/components/paysuite-manager';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager') redirect('/entrar');
  return (
    <main id="main" className="section-wrap">
      <PaySuiteManager />
    </main>
  );
}
