// Pure provider boundary. No secrets or customer details are logged.
export const PAYSUITE_API = 'https://paysuite.tech/api/v1';
export type PaySuiteMethod = 'mpesa' | 'emola' | 'credit_card';
export function paymentMethod(value: unknown): PaySuiteMethod {
  if (value !== 'mpesa' && value !== 'emola' && value !== 'credit_card')
    throw Error('Método de pagamento inválido.');
  return value;
}
export function minorAmount(value: unknown): number {
  const text = String(value);
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) throw Error('Valor inválido.');
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw Error('Valor inválido.');
  return amount;
}
export function checkoutURL(value: unknown): string {
  if (typeof value !== 'string') throw Error('Resposta de pagamento inválida.');
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'paysuite.tech' ||
    url.port ||
    url.username ||
    url.password ||
    !url.pathname.startsWith('/checkout/')
  )
    throw Error('Endereço de pagamento não autorizado.');
  return url.href;
}
export async function verifyPaySuiteSignature(
  raw: Uint8Array,
  signature: string,
  secret: string,
) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const bytes = Uint8Array.from(signature.match(/../g)!, (part) =>
    parseInt(part, 16),
  );
  return crypto.subtle.verify(
    'HMAC',
    key,
    bytes,
    raw as Uint8Array<ArrayBuffer>,
  );
}
export async function paysuiteRequest(
  token: string,
  path: string,
  body?: object,
  transport: typeof fetch = fetch,
) {
  if (!token) throw Error('Pagamentos indisponíveis.');
  const response = await transport(`${PAYSUITE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(body ? 12000 : 3000),
  });
  // Never surface the provider body: it may contain credentials or customer information.
  if (!response.ok)
    throw Error('Não foi possível confirmar o pedido no prestador.');
  const result = (await response.json()) as {
    status?: string;
    data?: Record<string, unknown>;
  };
  if (result.status !== 'success' || !result.data)
    throw Error('Resposta de pagamento inválida.');
  return result.data;
}
export function billingPeriodEnd(start: string, cycle: 'monthly' | 'annual') {
  const date = new Date(start);
  if (!Number.isFinite(date.getTime())) throw Error('Data inválida.');
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + (cycle === 'annual' ? 12 : 1));
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString();
}
