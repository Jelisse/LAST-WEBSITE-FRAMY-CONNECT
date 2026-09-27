import { hasProfessionalFeatures, type Membership } from './entitlement';
export async function customDomainRequest(
  request: Request,
  env: Cloudflare.Env,
): Promise<Request | Response> {
  const url = new URL(request.url),
    host = url.hostname.toLowerCase();
  let canonical: URL;
  try {
    canonical = new URL(env.PUBLIC_SITE_URL ?? 'http://localhost');
  } catch {
    return new Response('Configuração indisponível', { status: 503 });
  }
  if (
    host === canonical.hostname ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.workers.dev')
  )
    return request;
  const row = await env.DB.prepare(
    "SELECT d.owner_id,p.username FROM profile_domains d JOIN profiles p ON p.owner_id=d.owner_id JOIN auth_accounts a ON a.id=d.owner_id AND a.active=1 WHERE d.hostname=? AND d.status='active' AND d.checked_at>? AND p.published_json IS NOT NULL",
  )
    .bind(host, Date.now() - 24 * 3600000)
    .first<{ owner_id: string; username: string }>();
  if (!row) return new Response('Domínio indisponível', { status: 404 });
  const membership = await env.DB.prepare(
    'SELECT * FROM profile_membership_view WHERE owner_id=?',
  )
    .bind(row.owner_id)
    .first<Membership>();
  if (!hasProfessionalFeatures(membership))
    return new Response('Domínio indisponível', { status: 404 });
  const root = url.pathname === '/' || url.pathname === '/' + row.username;
  const asset =
    /^\/(assets|_next|brand|social|fonts)\//.test(url.pathname) ||
    url.pathname.startsWith('/api/profile-photo/');
  const publicPost =
    ['/api/profile-enquiries', '/api/profile-engagement'].includes(
      url.pathname,
    ) && request.method === 'POST';
  if (
    (!root && !asset && !publicPost) ||
    (!['GET', 'HEAD'].includes(request.method) && !publicPost)
  )
    return new Response('Não encontrado', { status: 404 });
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  headers.delete('host');
  if (publicPost) {
    if (headers.get('origin') !== url.origin)
      return new Response('Origem não autorizada', { status: 403 });
    headers.set('origin', canonical.origin);
  }
  url.protocol = canonical.protocol;
  url.host = canonical.host;
  if (root) url.pathname = '/' + row.username;
  return new Request(url, {
    method: request.method,
    headers,
    body: publicPost ? request.body : undefined,
    redirect: 'manual',
    duplex: 'half',
  } as RequestInit & { duplex: string });
}
