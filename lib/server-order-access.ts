import { database } from './server-db';

export async function canManageOrders(userId: string): Promise<boolean> {
  return !!(await database()
    .prepare('SELECT user_id FROM order_managers WHERE user_id=?')
    .bind(userId)
    .first());
}
