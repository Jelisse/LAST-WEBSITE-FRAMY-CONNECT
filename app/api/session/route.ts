import { getChatGPTUser } from '@/app/chatgpt-auth';
import { dashboardFor } from '@/lib/auth-policy';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await getChatGPTUser();
  return Response.json(
    { dashboard: user ? dashboardFor(user.role) : null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
