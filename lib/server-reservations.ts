import { database } from './server-db';
import type { SandboxOrder } from './domain';
export const RESERVATION_MS = 24 * 60 * 60 * 1000;
export const MAX_PENDING_ORDERS = 3;

// Lazy reclamation runs before availability, checkout and staff payment actions.
// Updates and inventory release share one D1 transaction and a version guard.
export async function expireReservations() {
  const db = database(),
    now = new Date().toISOString();
  const cutoff = new Date(Date.now() - RESERVATION_MS).toISOString();
  const rows = await db
    .prepare(`SELECT id,owner_id,data_json,version FROM sandbox_orders
    WHERE json_extract(data_json,'$.status')='PENDING_PAYMENT'
    AND json_extract(data_json,'$.paid')=0
    AND COALESCE(json_extract(data_json,'$.reservationExpiresAt'),strftime('%Y-%m-%dT%H:%M:%fZ',created_at,'+1 day'))<=?
    ORDER BY created_at LIMIT 100`)
    .bind(now)
    .all<{
      id: string;
      owner_id: string;
      data_json: string;
      version: number;
    }>();
  for (const row of rows.results) {
    const order = JSON.parse(row.data_json) as SandboxOrder;
    // Legacy orders use their original creation date. Never expire on malformed dates.
    if (!Number.isFinite(Date.parse(order.createdAt))) continue;
    const deadline =
      order.reservationExpiresAt ??
      new Date(Date.parse(order.createdAt) + RESERVATION_MS).toISOString();
    if (
      deadline > now ||
      (!order.reservationExpiresAt && order.createdAt > cutoff)
    )
      continue;
    const eventId = crypto.randomUUID();
    const next = {
      ...order,
      status: 'CANCELLED',
      cancellationReason: 'reservation-expired',
      version: row.version + 1,
      updatedAt: now,
    };
    await db.batch([
      db
        .prepare(
          `UPDATE sandbox_orders SET data_json=?,version=? WHERE id=? AND version=? AND json_extract(data_json,'$.status')='PENDING_PAYMENT' AND json_extract(data_json,'$.paid')=0`,
        )
        .bind(JSON.stringify(next), next.version, row.id, row.version),
      db
        .prepare(
          'INSERT INTO sandbox_events(id,owner_id,order_id,action,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
        )
        .bind(eventId, row.owner_id, row.id, 'reservation-expired', now),
      ...(order.design?.optionId
        ? [
            db
              .prepare(
                'UPDATE product_options SET quantity=quantity+1,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM sandbox_events WHERE id=?)',
              )
              .bind(order.design.optionId, eventId),
          ]
        : []),
      db
        .prepare(
          'INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sandbox_events WHERE id=?)',
        )
        .bind(
          crypto.randomUUID(),
          'system',
          'Reserva expirada',
          row.id,
          now,
          eventId,
        ),
    ]);
  }
}
