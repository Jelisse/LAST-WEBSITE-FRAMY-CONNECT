import { validateHostname } from './profile-growth';
export type DomainEnv = {
  DB: D1Database;
  CF_SAAS_TOKEN?: string;
  CF_SAAS_ZONE_ID?: string;
  CF_SAAS_CNAME_TARGET?: string;
};
type DomainRow = {
  hostname: string;
  owner_id: string;
  token: string;
  provider_id: string | null;
};
export function domainsConfigured(e: DomainEnv) {
  return !!(
    e.CF_SAAS_TOKEN &&
    /^[a-f0-9]{32}$/.test(e.CF_SAAS_ZONE_ID ?? '') &&
    e.CF_SAAS_CNAME_TARGET
  );
}
async function dns(name: string, type: string) {
  const r = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!r.ok) throw Error('Não foi possível consultar o DNS.');
  const data = (await r.json()) as {
    Answer?: { data: string; type: number }[];
  };
  return data.Answer ?? [];
}
async function provider(
  e: DomainEnv,
  path: string,
  method = 'GET',
  body?: unknown,
) {
  if (!domainsConfigured(e))
    throw Error('O serviço de domínios ainda não está configurado.');
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${e.CF_SAAS_ZONE_ID}/custom_hostnames${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${e.CF_SAAS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    },
  );
  const d = (await r.json()) as {
    success: boolean;
    result: {
      id: string;
      status: string;
      ssl?: { status: string; validation_records?: unknown[] };
      ownership_verification?: unknown;
    };
  };
  if (!r.ok || !d.success)
    throw Error(
      'O prestador não conseguiu actualizar o domínio. Confirme a configuração Cloudflare for SaaS.',
    );
  return d.result;
}
export async function verifyProfileDomain(e: DomainEnv, row: DomainRow) {
  const hostname = validateHostname(row.hostname);
  const txt = await dns('_framy.' + hostname, 'TXT');
  if (
    !txt.some((a) => a.type === 16 && a.data.replace(/"/g, '') === row.token)
  ) {
    await e.DB.prepare(
      "UPDATE profile_domains SET status='pending',checked_at=? WHERE hostname=? AND token=?",
    )
      .bind(Date.now(), hostname, row.token)
      .run();
    return;
  }
  if (!domainsConfigured(e)) {
    await e.DB.prepare(
      "UPDATE profile_domains SET status='verified',checked_at=? WHERE hostname=? AND token=?",
    )
      .bind(Date.now(), hostname, row.token)
      .run();
    return;
  }
  let result;
  if (row.provider_id) result = await provider(e, '/' + row.provider_id);
  else {
    result = await provider(e, '', 'POST', {
      hostname,
      ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } },
    });
    await e.DB.prepare(
      'UPDATE profile_domains SET provider_id=? WHERE hostname=? AND token=?',
    )
      .bind(result.id, hostname, row.token)
      .run();
  }
  const target = e.CF_SAAS_CNAME_TARGET!.toLowerCase().replace(/\.$/, '');
  const answers = await dns(hostname, 'CNAME');
  const points = answers.some(
    (a) => a.type === 5 && a.data.toLowerCase().replace(/\.$/, '') === target,
  );
  const active =
    points && result.status === 'active' && result.ssl?.status === 'active';
  await e.DB.prepare(
    'UPDATE profile_domains SET status=?,checks_json=?,checked_at=? WHERE hostname=? AND token=?',
  )
    .bind(
      active ? 'active' : 'validating',
      JSON.stringify({
        ownership: result.ownership_verification ?? null,
        ssl: result.ssl?.validation_records ?? [],
        hostnameStatus: result.status,
        sslStatus: result.ssl?.status,
        cname: points,
      }),
      Date.now(),
      hostname,
      row.token,
    )
    .run();
}
export async function removeProfileDomain(e: DomainEnv, row: DomainRow) {
  if (row.provider_id) await provider(e, '/' + row.provider_id, 'DELETE');
  await e.DB.prepare(
    'DELETE FROM profile_domains WHERE hostname=? AND owner_id=? AND token=?',
  )
    .bind(row.hostname, row.owner_id, row.token)
    .run();
}
export async function refreshProfileDomains(e: DomainEnv) {
  if (!domainsConfigured(e)) return;
  const rows = await e.DB.prepare(
    'SELECT * FROM profile_domains WHERE checked_at IS NULL OR checked_at<? ORDER BY COALESCE(checked_at,0) LIMIT 10',
  )
    .bind(Date.now() - 3600000)
    .all<DomainRow>();
  for (const row of rows.results) {
    try {
      await verifyProfileDomain(e, row);
    } catch {
      /* Keep last-known status, with a 24-hour serving cutoff. */
    }
  }
}
