import { cookies } from 'next/headers';
import { database } from './server-db';
import type { AccountRole } from './auth-policy';
export const SESSION_COOKIE = 'framy_session';
export type Account = {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  password_hash: string;
};
export async function tokenHash(token: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function sessionAccount() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const account = await database()
    .prepare(
      'SELECT a.* FROM auth_accounts a JOIN auth_sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires_at>? AND a.active=1',
    )
    .bind(await tokenHash(token), Date.now())
    .first<Account>();
  if (account?.role === 'agent') {
    const record = await database()
      .prepare(
        "SELECT data_json FROM manager_records WHERE id=? AND kind='agent'",
      )
      .bind(account.id)
      .first<{ data_json: string }>();
    if (!record || !JSON.parse(record.data_json).active) return null;
  }
  return account;
}
