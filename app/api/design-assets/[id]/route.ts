import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageOrders } from '@/lib/server-order-access';
import { env } from 'cloudflare:workers';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getChatGPTUser();
  if (!user) return new Response('Inicie sessão.', { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id))
    return new Response('Inválido', { status: 404 });
  const asset = await env.PROFILE_PHOTOS?.get(`designs/${id}`);
  if (
    !asset ||
    (asset.customMetadata?.ownerId !== user.userId &&
      !(await canManageOrders(user.userId)))
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
