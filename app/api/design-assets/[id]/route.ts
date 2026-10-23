import { guestSession } from '@/lib/guest-checkout';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageOrders } from '@/lib/server-order-access';
import { env } from 'cloudflare:workers';
import { database } from '@/lib/server-db';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await getChatGPTUser();
  const session = await guestSession(_request);
  const user =
    account ??
    (session ? { userId: 'guest:' + session.id, role: 'guest' } : null);
  if (!user) return new Response('Inicie sessão.', { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id))
    return new Response('Inválido', { status: 404 });
  const asset = await env.PROFILE_PHOTOS?.get(`designs/${id}`);
  const assignedAgent =
    user.role === 'agent' &&
    !!(await database()
      .prepare(
        "SELECT id FROM sandbox_orders WHERE json_extract(data_json,'$.agentId')=? AND json_extract(data_json,'$.paid')=1 AND json_extract(data_json,'$.status')<>'CANCELLED' AND (json_extract(data_json,'$.design.front.assetId')=? OR json_extract(data_json,'$.design.back.assetId')=?) LIMIT 1",
      )
      .bind(user.userId, id, id)
      .first());
  const purchasedAsset =
    account &&
    !!(await database()
      .prepare(
        "SELECT o.id FROM paysuite_product_orders o JOIN paysuite_payments p ON p.target_id=o.id AND p.kind='product' AND p.status='paid' LEFT JOIN order_progress r ON r.order_id=o.id WHERE (o.owner_id=? OR (?='agent' AND r.agent_id=?)) AND EXISTS(SELECT 1 FROM json_tree(o.configuration_json) j WHERE j.key='assetId' AND j.value=?) LIMIT 1",
      )
      .bind(account.userId, account.role, account.userId, id)
      .first());
  if (
    !asset ||
    (asset.customMetadata?.ownerId !== user.userId &&
      (!session || asset.customMetadata?.ownerId !== 'guest:' + session.id) &&
      !(await canManageOrders(user.userId)) &&
      !assignedAgent &&
      !purchasedAsset)
  )
    return new Response('Não encontrado', { status: 404 });
  return new Response(asset.body, {
    headers: {
      'Content-Type':
        asset.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="design-${id}.${asset.httpMetadata?.contentType === 'application/pdf' ? 'pdf' : asset.httpMetadata?.contentType === 'image/png' ? 'png' : 'jpg'}"`,
    },
  });
}
