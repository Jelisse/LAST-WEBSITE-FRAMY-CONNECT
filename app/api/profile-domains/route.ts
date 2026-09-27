import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { validateHostname } from '@/lib/profile-growth';
import {
  verifyProfileDomain,
  removeProfileDomain,
  domainsConfigured,
} from '@/lib/profile-domains';
import { hasProfessionalFeatures } from '@/lib/entitlement';
import { profileMembership } from '@/lib/server-profile-access';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
export async function GET() {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const domain = await database()
      .prepare('SELECT * FROM profile_domains WHERE owner_id=?')
      .bind(u.userId)
      .first();
    return json({
      domain,
      configured: domainsConfigured(env),
      cname: env.CF_SAAS_CNAME_TARGET ?? null,
    });
  } catch {
    return json({ error: 'Domínios temporariamente indisponíveis.' }, 503);
  }
}
export async function POST(request: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const b = await profileBody(request),
      db = database();
    const row = await db
      .prepare('SELECT * FROM profile_domains WHERE owner_id=?')
      .bind(u.userId)
      .first<{
        hostname: string;
        owner_id: string;
        token: string;
        provider_id: string | null;
      }>();
    if (b.action === 'remove') {
      if (row) await removeProfileDomain(env, row);
      return json({ ok: true });
    }
    if (!hasProfessionalFeatures(await profileMembership(u.userId)))
      return json(
        {
          error:
            'O domínio personalizado requer o plano Profissional ou uma experiência activa.',
        },
        403,
      );
    if (!(await rateLimit(request, 'profile-domain', 15)))
      return json({ error: 'Aguarde antes de voltar a verificar.' }, 429);
    if (b.action === 'add') {
      if (row) throw Error('Remova o domínio actual antes de adicionar outro.');
      await db
        .prepare(
          'INSERT INTO profile_domains(hostname,owner_id,token,created_at) VALUES(?,?,?,?)',
        )
        .bind(
          validateHostname(b.hostname),
          u.userId,
          'framy-' + crypto.randomUUID(),
          Date.now(),
        )
        .run();
      return json({ ok: true });
    }
    if (b.action === 'verify') {
      if (!row) throw Error('Adicione primeiro um domínio.');
      await verifyProfileDomain(env, row);
      return json({ ok: true });
    }
    throw Error('Acção inválida.');
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQLITE|D1|UNIQUE|no such/.test(e.message)
            ? e.message
            : 'Domínio indisponível ou já associado a outra conta.',
      },
      422,
    );
  }
}
