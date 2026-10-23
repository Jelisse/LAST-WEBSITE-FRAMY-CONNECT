import { env } from 'cloudflare:workers';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { rateLimit } from '@/lib/request-limits';
import {
  guestSession,
  guestCookie,
  guestHash,
  randomToken,
} from '@/lib/guest-checkout';
export async function POST(request: Request) {
  try {
    await profileBody(request);
    if (await guestSession(request)) return json({ ready: true });
    if (!(await rateLimit(request, 'guest-session', 20)))
      return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
    const token = randomToken();
    await env.DB.prepare(
      'INSERT INTO guest_checkout_sessions(id,token_hash,expires_at) VALUES(?,?,?)',
    )
      .bind(
        crypto.randomUUID(),
        await guestHash(token),
        Date.now() + 30 * 86400000,
      )
      .run();
    const response = json({ ready: true });
    response.headers.set(
      'Set-Cookie',
      guestCookie +
        '=' +
        token +
        '; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000' +
        (new URL(request.url).protocol === 'https:' ? '; Secure' : ''),
    );
    return response;
  } catch {
    return json(
      { error: 'Não foi possível preparar a compra. Tente novamente.' },
      503,
    );
  }
}
