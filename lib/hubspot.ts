// Fixed provider host, bounded calls and create-only behaviour for the pilot.
// Existing contacts are matched by email and never overwritten.
export type CRMContact = { name: string; email: string; phone: string };
type HubSpotFailure =
  | 'credentials'
  | 'permissions'
  | 'limited'
  | 'rejected'
  | 'uncertain'
  | 'unavailable'
  | 'request';
export class HubSpotError extends Error {
  code: HubSpotFailure;
  constructor(code: HubSpotFailure) {
    super(code);
    this.code = code;
  }
}
async function provider(token: string, path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch('https://api.hubapi.com' + path, {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    throw new HubSpotError('uncertain');
  }
  // Never follow redirects: bearer credentials must stay on the fixed provider host.
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new HubSpotError('rejected');
  }
  if (response.status === 401) throw new HubSpotError('credentials');
  if (response.status === 403) throw new HubSpotError('permissions');
  if (response.status === 429) throw new HubSpotError('limited');
  return response;
}
async function providerID(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new HubSpotError('uncertain');
  let size = 0,
    raw = '';
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > 65536) {
        await reader.cancel();
        throw Error();
      }
      raw += decoder.decode(item.value, { stream: true });
    }
    const data = JSON.parse(raw + decoder.decode()) as { id?: unknown };
    if (typeof data.id !== 'string' || !/^\d+$/.test(data.id)) throw Error();
    return data.id;
  } catch {
    throw new HubSpotError('uncertain');
  }
}
export async function verifyHubSpot(token: string) {
  const r = await provider(
    token,
    '/crm/v3/objects/contacts?limit=1&properties=hs_object_id',
  );
  await r.body?.cancel();
  if (r.status === 400) throw new HubSpotError('request');
  if (r.status >= 500) throw new HubSpotError('unavailable');
  if (!r.ok) throw new HubSpotError('rejected');
}
export async function sendHubSpot(token: string, contact: CRMContact) {
  const find = () =>
    provider(
      token,
      '/crm/v3/objects/contacts/' +
        encodeURIComponent(contact.email) +
        '?idProperty=email&properties=',
    );
  let r = await find();
  if (r.ok) {
    return { id: await providerID(r), existing: true };
  }
  if (r.status !== 404) throw new HubSpotError('rejected');
  await r.body?.cancel();
  const [firstname, ...rest] = contact.name.trim().split(/\s+/);
  r = await provider(token, '/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        email: contact.email,
        firstname,
        lastname: rest.join(' '),
        ...(contact.phone ? { phone: contact.phone } : {}),
      },
    }),
  });
  const existing = r.status === 409;
  if (existing) {
    await r.body?.cancel();
    r = await find();
  }
  if (!r.ok) {
    await r.body?.cancel();
    throw new HubSpotError(r.status >= 500 ? 'uncertain' : 'rejected');
  }
  return { id: await providerID(r), existing };
}
async function encryptionKey(value: string) {
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  } catch {
    throw Error('CRM indisponível.');
  }
  if (bytes.length !== 32) throw Error('CRM indisponível.');
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}
export async function sealCRM(
  token: string,
  organisation: string,
  secret: string,
) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: new TextEncoder().encode(organisation),
      },
      await encryptionKey(secret),
      new TextEncoder().encode(token),
    ),
  );
  return btoa(String.fromCharCode(...iv, ...data));
}
export async function openCRM(
  cipher: string,
  organisation: string,
  secret: string,
) {
  const bytes = Uint8Array.from(atob(cipher), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: bytes.slice(0, 12),
        additionalData: new TextEncoder().encode(organisation),
      },
      await encryptionKey(secret),
      bytes.slice(12),
    ),
  );
}
