import { env } from 'cloudflare:workers';
export const guestCookie = 'framy_guest_checkout';
export const randomToken = () =>
  crypto.randomUUID().replaceAll('-', '') +
  crypto.randomUUID().replaceAll('-', '');
export async function guestHash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function guestSession(request: Request) {
  const token = (request.headers.get('cookie') || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(guestCookie + '='))
    ?.slice(guestCookie.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return env.DB.prepare(
    'SELECT id FROM guest_checkout_sessions WHERE token_hash=? AND expires_at>?',
  )
    .bind(await guestHash(token), Date.now())
    .first<{ id: string }>();
}
export async function guestOwns(request: Request, id: string) {
  const session = await guestSession(request);
  return session
    ? !!(await env.DB.prepare(
        'SELECT id FROM guest_purchases WHERE id=? AND session_id=?',
      )
        .bind(id, session.id)
        .first())
    : false;
}
export function buyerDetails(name: unknown, email: unknown) {
  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    name.trim().length > 100 ||
    /[\r\n]/.test(name)
  )
    throw Error('Indique o nome do comprador.');
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email)
  )
    throw Error('Indique um email válido.');
  return { name: name.trim(), email: email.trim().toLowerCase() };
}
