import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { profileJSON as json } from '@/lib/profile-api';
import { rateLimit } from '@/lib/request-limits';
import { PAYSUITE_API } from '@/lib/paysuite';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!(await getChatGPTUser())) return json({ error: 'Inicie sessão.' }, 401);
  if (!(await rateLimit(request, 'ps-connection', 6))) return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
  const token = env.PAYSUITE_API_TOKEN?.trim();
  if (!token) return json({ configured: false }, 503);
  try {
    // GET only: this deliberately nonexistent payment ID cannot initiate a charge.
    const response = await fetch(`${PAYSUITE_API}/payments/00000000-0000-0000-0000-000000000000`, {
      method: 'GET', redirect: 'manual',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    return json({
      providerHttpStatus: response.status,
      result: response.status === 401 ? 'authentication_rejected'
        : response.status === 404 ? 'authentication_check_passed_payment_not_found'
        : 'provider_response_requires_review',
      paymentCreated: false,
    });
  } catch {
    return json({ result: 'connection_failed', paymentCreated: false }, 503);
  }
}
