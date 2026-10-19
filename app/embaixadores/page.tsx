import { getChatGPTUser } from '@/app/chatgpt-auth';
import {
  AmbassadorDashboard,
  AmbassadorLanding,
} from '@/components/ambassador-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Embaixadores | Framy Connect',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await getChatGPTUser();
  return user ? (
    <main className="ambassador-landing">
      <AmbassadorDashboard />
    </main>
  ) : (
    <AmbassadorLanding />
  );
}
