import { database } from './server-db';

export async function canManageOrders(userId: string): Promise<boolean> {
  return !!(await database()
    .prepare("SELECT id FROM auth_accounts WHERE id=? AND role='manager' AND active=1")
    .bind(userId)
    .first());
}
