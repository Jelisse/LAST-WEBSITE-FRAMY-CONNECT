import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { profileJSON } from '@/lib/profile-api';
export const dynamic = 'force-dynamic';
export async function GET() {
  const u = await getChatGPTUser();
  if (!u) return profileJSON({ demo: null });
  const d = await database()
    .prepare(
      'SELECT label,expires_at FROM demo_accounts WHERE account_id=? AND expires_at>?',
    )
    .bind(u.userId, Date.now())
    .first();
  return profileJSON({ demo: d || null });
}
