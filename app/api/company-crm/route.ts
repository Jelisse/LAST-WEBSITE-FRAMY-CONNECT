import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { corporateAccess } from '@/lib/server-corporate';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { rateLimit } from '@/lib/request-limits';
import {
  sealCRM,
  openCRM,
  verifyHubSpot,
  sendHubSpot,
  HubSpotError,
} from '@/lib/hubspot';
export const dynamic = 'force-dynamic';
const gate = `EXISTS(SELECT 1 FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id WHERE o.id=? AND m.account_id=? AND m.active=1 AND m.role='leader')`;
const ownerGate = `EXISTS(SELECT 1 FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id WHERE o.id=? AND o.owner_id=? AND m.account_id=o.owner_id AND m.active=1 AND m.role='leader')`;
const leadScope = `SELECT l.id,l.name,l.email,l.phone FROM corporate_leads l JOIN corporate_assignments a ON a.id=l.assignment_id JOIN corporate_campaigns c ON c.id=a.campaign_id WHERE l.id=? AND c.organisation_id=? AND l.consent_version<>'' AND l.created_at>=?`;
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const id = new URL(request.url).searchParams.get('organisation') || '',
      org = await corporateAccess(user.userId, id, true),
      db = database();
    const connection = await db
      .prepare(
        'SELECT version,updated_at FROM corporate_crm_connections WHERE organisation_id=?',
      )
      .bind(id)
      .first();
    const leads = await db
      .prepare(
        `SELECT l.id,l.name,l.email,l.phone,s.status,s.updated_at FROM corporate_leads l JOIN corporate_assignments a ON a.id=l.assignment_id JOIN corporate_campaigns c ON c.id=a.campaign_id LEFT JOIN corporate_crm_syncs s ON s.lead_id=l.id AND s.connection_version=COALESCE((SELECT version FROM corporate_crm_connections WHERE organisation_id=c.organisation_id),-1) WHERE c.organisation_id=? AND l.consent_version<>'' AND l.email<>'' AND l.created_at>=? ORDER BY l.created_at DESC LIMIT 100`,
      )
      .bind(id, Date.now() - 90 * 86400000)
      .all();
    return json({
      ready: !!env.CRM_ENCRYPTION_KEY,
      owner: org.owner_id === user.userId,
      connected: !!connection,
      version: connection?.version || 0,
      leads: leads.results,
    });
  } catch {
    return json({ error: 'Sem permissão nesta organização.' }, 403);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const body = await profileBody(request, 8000),
      id = typeof body.organisation === 'string' ? body.organisation : '',
      org = await corporateAccess(user.userId, id, true),
      db = database();
    if (!(await rateLimit(request, 'company-crm:' + user.userId, 30)))
      return json({ error: 'Tente novamente mais tarde.' }, 429);
    if (!env.CRM_ENCRYPTION_KEY)
      return json({ error: 'CRM indisponível.' }, 503);
    const connection = await db
      .prepare(
        'SELECT token_cipher,version FROM corporate_crm_connections WHERE organisation_id=?',
      )
      .bind(id)
      .first<{ token_cipher: string; version: number }>();
    if (body.action === 'connect') {
      if (org.owner_id !== user.userId)
        return json({ error: 'Sem permissão.' }, 403);
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      if (!/^[A-Za-z0-9_.-]{20,512}$/.test(token))
        return json(
          {
            error:
              'Copie o token de acesso da aplicação privada HubSpot, sem espaços internos.',
          },
          422,
        );
      if (body.version !== (connection?.version || 0))
        return json({ error: 'Os dados mudaram. Actualize a página.' }, 409);
      await verifyHubSpot(token);
      const cipher = await sealCRM(token, id, env.CRM_ENCRYPTION_KEY),
        nextVersion = Math.max(Date.now(), (connection?.version || 0) + 1);
      const r = await db
        .prepare(
          `INSERT INTO corporate_crm_connections(organisation_id,provider,token_cipher,version,updated_at) SELECT ?,'hubspot',?,?,? WHERE (?=0 OR EXISTS(SELECT 1 FROM corporate_crm_connections WHERE organisation_id=?)) AND ${ownerGate} ON CONFLICT(organisation_id) DO UPDATE SET token_cipher=excluded.token_cipher,version=excluded.version,updated_at=excluded.updated_at WHERE corporate_crm_connections.version=? AND ${ownerGate}`,
        )
        .bind(
          id,
          cipher,
          nextVersion,
          Date.now(),
          body.version,
          id,
          id,
          user.userId,
          body.version,
          id,
          user.userId,
        )
        .run();
      return r.meta.changes
        ? json({ ok: true })
        : json({ error: 'Os dados mudaram. Actualize a página.' }, 409);
    }
    if (body.action === 'disconnect') {
      if (org.owner_id !== user.userId)
        return json({ error: 'Sem permissão.' }, 403);
      const r = await db
        .prepare(
          `DELETE FROM corporate_crm_connections WHERE organisation_id=? AND version=? AND ${ownerGate}`,
        )
        .bind(id, body.version, id, user.userId)
        .run();
      return r.meta.changes
        ? json({ ok: true })
        : json({ error: 'Os dados mudaram. Actualize a página.' }, 409);
    }
    if (
      body.action !== 'sync' ||
      body.confirm !== true ||
      !connection ||
      !Array.isArray(body.leads) ||
      !body.leads.length ||
      body.leads.length > 5 ||
      body.version !== connection.version ||
      body.leads.some((x) => typeof x !== 'string' || x.length > 80)
    )
      throw Error();
    // Each selected lead is tenant-scoped, recent and consented. Never transfer notes or marketing permission.
    const results: { id: string; status: string; existing?: boolean }[] = [];
    for (const leadId of new Set(body.leads as string[])) {
      const lead = await db
        .prepare(leadScope)
        .bind(leadId, id, Date.now() - 90 * 86400000)
        .first<{ id: string; name: string; email: string; phone: string }>();
      if (!lead || !/^\S+@\S+\.\S+$/.test(lead.email)) {
        results.push({ id: leadId, status: 'unavailable' });
        continue;
      }
      const requestId = crypto.randomUUID(),
        now = Date.now();
      const lock = await db
        .prepare(
          `INSERT INTO corporate_crm_syncs(lead_id,organisation_id,status,request_id,connection_version,updated_at) SELECT ?,?,'pending',?,?,? WHERE ${gate} AND EXISTS(SELECT 1 FROM corporate_crm_connections WHERE organisation_id=? AND version=?) ON CONFLICT(lead_id) DO UPDATE SET status='pending',request_id=excluded.request_id,connection_version=excluded.connection_version,external_id='',updated_at=excluded.updated_at WHERE corporate_crm_syncs.connection_version<>excluded.connection_version OR corporate_crm_syncs.status IN ('error','uncertain') OR (corporate_crm_syncs.status='pending' AND corporate_crm_syncs.updated_at<?)`,
        )
        .bind(
          leadId,
          id,
          requestId,
          connection.version,
          now,
          id,
          user.userId,
          id,
          connection.version,
          now - 120000,
        )
        .run();
      if (!lock.meta.changes) {
        results.push({ id: leadId, status: 'already-processed' });
        continue;
      }
      try {
        // Recheck immediately before outbound transfer, including late member suspension/disconnection.
        await corporateAccess(user.userId, id, true);
        const current = await db
          .prepare(
            'SELECT token_cipher FROM corporate_crm_connections WHERE organisation_id=? AND version=?',
          )
          .bind(id, connection.version)
          .first<{ token_cipher: string }>();
        if (
          !current ||
          !(await db
            .prepare(leadScope)
            .bind(leadId, id, Date.now() - 90 * 86400000)
            .first())
        )
          throw new HubSpotError('rejected');
        const sent = await sendHubSpot(
          await openCRM(current.token_cipher, id, env.CRM_ENCRYPTION_KEY),
          lead,
        );
        await db
          .prepare(
            `UPDATE corporate_crm_syncs SET status='sent',external_id=?,updated_at=? WHERE lead_id=? AND request_id=?`,
          )
          .bind(sent.id, Date.now(), leadId, requestId)
          .run();
        results.push({ id: leadId, status: 'sent', existing: sent.existing });
      } catch (error) {
        const code = error instanceof HubSpotError ? error.code : 'rejected',
          status = code === 'uncertain' ? 'uncertain' : 'error';
        await db
          .prepare(
            'UPDATE corporate_crm_syncs SET status=?,updated_at=? WHERE lead_id=? AND request_id=?',
          )
          .bind(status, Date.now(), leadId, requestId)
          .run();
        results.push({ id: leadId, status: code });
        if (
          ['credentials', 'permissions', 'limited', 'uncertain'].includes(code)
        )
          break;
      }
    }
    await db
      .prepare(
        'INSERT INTO corporate_audit(id,organisation_id,actor,action,subject,created_at) VALUES(?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        id,
        user.userId,
        'crm-transfer',
        String(results.filter((r) => r.status === 'sent').length),
        Date.now(),
      )
      .run();
    return json({ results });
  } catch (error) {
    return json(
      {
        error:
          error instanceof HubSpotError
            ? error.code === 'credentials'
              ? 'Credenciais HubSpot inválidas.'
              : error.code === 'permissions'
                ? 'O token HubSpot não tem permissão para ler contactos. Active crm.objects.contacts.read e crm.objects.contacts.write na aplicação privada.'
                : error.code === 'request'
                  ? 'HubSpot recusou o pedido de verificação (HTTP 400). Confirme que copiou o token de acesso de uma aplicação privada.'
                  : error.code === 'unavailable'
                    ? 'O serviço HubSpot está temporariamente indisponível. Tente novamente mais tarde.'
                    : error.code === 'uncertain'
                      ? 'Não foi possível contactar o HubSpot. A ligação não foi confirmada; tente novamente.'
                      : error.code === 'limited'
                        ? 'HubSpot ocupado. Tente mais tarde.'
                        : 'Não foi possível ligar ao HubSpot.'
            : 'Não foi possível guardar.',
      },
      422,
    );
  }
}
