// Pure provider boundary. No secrets or customer details are logged.
export const PAYSUITE_API = 'https://paysuite.tech/api/v1';
export class PaySuiteError extends Error {
  category: 'http' | 'timeout' | 'network' | 'invalid_response';
  httpStatus: number | null;
  constructor(category: 'http' | 'timeout' | 'network' | 'invalid_response', httpStatus: number | null = null) {
    super('Não foi possível abrir o pagamento no prestador.');
    this.category = category;
    this.httpStatus = httpStatus;
  }
}
export function paymentDiagnostic(error: unknown) {
  return error instanceof PaySuiteError
    ? { category: error.category, httpStatus: error.httpStatus }
    : { category: 'invalid_response', httpStatus: null };
}
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
  let response: Response;
  try { response = await transport(`${PAYSUITE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    // Workers supports follow/manual only. Inspect redirects without forwarding credentials.
    redirect: 'manual',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(body ? 12000 : 3000),
  }); } catch (error) {
    throw new PaySuiteError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'network');
  }
  // Never surface the provider body: it may contain credentials or customer information.
  if (!response.ok)
    throw new PaySuiteError('http', response.status);
  let result: {
    status?: string;
    data?: Record<string, unknown>;
  };
  try { result = await response.json(); } catch { throw new PaySuiteError('invalid_response', response.status); }
  if (result.status !== 'success' || !result.data)
    throw new PaySuiteError('invalid_response', response.status);
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
