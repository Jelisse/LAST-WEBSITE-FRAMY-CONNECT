import { database } from '@/lib/server-db';
import { getProducts, canManageCatalog } from '@/lib/server-catalog';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { tokenHash } from '@/lib/server-auth';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  try {
    if (!(await rateLimit(request, 'product-visits', 120)))
      return json({ error: 'Tente mais tarde.' }, 429);
    const raw = await request.text();
    if (raw.length > 1000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const b = JSON.parse(raw);
    if (typeof b.session !== 'string' || !/^[0-9a-f-]{36}$/.test(b.session))
      return json({ error: 'Visita inválida.' }, 422);
    const user = await getChatGPTUser();
    if (user && user.role !== 'customer') return json({ recorded: false });
    if (
      !(await getProducts()).some(
        (p) => p.id === b.productId && p.published !== false,
      )
    )
      return json({ error: 'Produto não encontrado.' }, 404);
    const day = new Date().toISOString().slice(0, 10);
    await database().batch([
      database()
        .prepare(
          'INSERT OR IGNORE INTO product_visits(id,product_id,day) VALUES(?,?,?)',
        )
        .bind(
          await tokenHash(day + ':' + b.productId + ':' + b.session),
          b.productId,
          day,
        ),
      database()
        .prepare('DELETE FROM product_visits WHERE day<?')
        .bind(new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)),
    ]);
    return json({ recorded: true });
  } catch {
    return json({ error: 'Não foi possível registar a visita.' }, 503);
  }
}
export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user || !(await canManageCatalog(user.userId)))
      return json({ error: 'Acesso reservado à gestão.' }, 403);
    const since = new Date(Date.now() - 29 * 86400000)
      .toISOString()
      .slice(0, 10);
    const visits = await database()
      .prepare(
        'SELECT product_id,COUNT(*) AS visits FROM product_visits WHERE day>=? GROUP BY product_id ORDER BY visits DESC',
      )
      .bind(since)
      .all();
    const orders = await database()
      .prepare(
        "SELECT json_extract(data_json,'$.productId') AS product_id,COUNT(*) AS orders FROM sandbox_orders WHERE created_at>=? GROUP BY product_id",
      )
      .bind(since)
      .all();
    return json({ visits: visits.results, orders: orders.results, since });
  } catch {
    return json({ error: 'Estatísticas indisponíveis.' }, 503);
  }
}
