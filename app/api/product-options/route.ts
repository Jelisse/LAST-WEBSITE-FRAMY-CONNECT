import { expireReservations } from '@/lib/server-reservations';
import { serviceFailure } from '@/lib/service-failure';
import { database } from '@/lib/server-db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageCatalog } from '@/lib/server-catalog';
export const dynamic = 'force-dynamic';
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  try {
    await expireReservations();
    return json({
      options: (
        await database()
          .prepare('SELECT * FROM product_options ORDER BY id')
          .all()
      ).results,
    });
  } catch (error) {
    return serviceFailure(error, 'product-options', 'Stock indisponível. Tente novamente.');
  }
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem inválida.' }, 403);
  if (!(await canManageCatalog(user.userId)))
    return json({ error: 'Acesso reservado à gestão.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 2000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const d = JSON.parse(raw);
    if (
      typeof d.id !== 'string' ||
      !Number.isSafeInteger(d.quantity) ||
      d.quantity < 0 ||
      d.quantity > 1000000 ||
      ![0, 1].includes(d.enabled) ||
      !Number.isSafeInteger(d.version)
    )
      return json({ error: 'Stock inválido.' }, 422);
    const db = database();
    const result = await db.batch([
      db
        .prepare(
          'UPDATE product_options SET quantity=?,enabled=?,version=version+1 WHERE id=? AND version=?',
        )
        .bind(d.quantity, d.enabled, d.id, d.version),
      db
        .prepare('INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0')
        .bind(
          crypto.randomUUID(),
          user.userId,
          'Stock / personalização',
          `${d.id}: ${d.quantity}; activo=${d.enabled}`,
          new Date().toISOString(),
        ),
    ]);
    if (!result[0].meta.changes)
      return json({ error: 'O stock mudou. Actualize antes de guardar.' }, 409);
    return json({ ok: true });
  } catch {
    return json({ error: 'Não foi possível guardar o stock.' }, 422);
  }
}
