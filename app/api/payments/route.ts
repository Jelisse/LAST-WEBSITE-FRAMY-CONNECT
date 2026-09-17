import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { expireReservations } from '@/lib/server-reservations';
import { paymentLink } from '@/lib/payment-policy';
import type { SandboxOrder } from '@/lib/domain';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    await expireReservations();
    const id = new URL(request.url).searchParams.get('order');
    const row = await database()
      .prepare('SELECT data_json FROM sandbox_orders WHERE id=? AND owner_id=?')
      .bind(id ?? '', user.userId)
      .first<{ data_json: string }>();
    if (!row) return json({ error: 'Pedido não encontrado.' }, 404);
    const order = JSON.parse(row.data_json) as SandboxOrder;
    return json({
      orderId: order.id,
      amount: order.amount,
      currency: 'MZN',
      status: order.status,
      paid: order.paid,
      url: paymentLink(order),
      confirmation: 'manual',
      expiresAt: order.reservationExpiresAt,
    });
  } catch {
    return json({ error: 'Não foi possível consultar o pagamento.' }, 503);
  }
}
