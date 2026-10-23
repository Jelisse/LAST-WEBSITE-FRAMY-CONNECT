import { activeProfileSQL } from '@/lib/entitlement';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { corporatePlan } from '@/lib/server-corporate';
import { database } from '@/lib/server-db';
export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const missing = () =>
    new Response('Fotografia indisponível.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  if (!/^[0-9a-f-]{36}$/.test(id) || !env.PROFILE_PHOTOS) return missing();
  const object = await env.PROFILE_PHOTOS.get(`profiles/${id}`);
  if (!object) return missing();
  const user = await getChatGPTUser();
  if (object.customMetadata?.ownerId !== user?.userId) {
    const published = await database()
      .prepare(
        `SELECT owner_id FROM profiles WHERE (json_extract(published_json, '$.photoUrl')=? OR json_extract(published_json, '$.coverUrl')=?) AND owner_id=? AND ${activeProfileSQL} LIMIT 1`,
      )
      .bind(
        `/api/profile-photo/${id}`,
        `/api/profile-photo/${id}`,
        object.customMetadata?.ownerId ?? '',
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .first();
    if (!published) {
      const url = `/api/profile-photo/${id}`;
      let company = await database()
        .prepare(
          `SELECT o.owner_id FROM corporate_cards c JOIN corporate_templates t ON t.organisation_id=c.organisation_id JOIN corporate_active_organisations o ON o.id=c.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=c.account_id AND m.active=1 WHERE (c.published_json IS NOT NULL AND (json_extract(c.published_json,'$.photoUrl')=? OR json_extract(t.template_json,'$.logoUrl')=? OR json_extract(t.template_json,'$.coverUrl')=?)) OR (o.id=c.organisation_id AND EXISTS(SELECT 1 FROM corporate_effective_members viewer WHERE viewer.organisation_id=o.id AND viewer.account_id=? AND viewer.active=1 AND (viewer.role='leader' OR viewer.account_id=c.account_id)) AND (json_extract(c.draft_json,'$.photoUrl')=? OR json_extract(t.template_json,'$.logoUrl')=? OR json_extract(t.template_json,'$.coverUrl')=?)) LIMIT 1`,
        )
        .bind(url, url, url, user?.userId || '', url, url, url)
        .first<{ owner_id: string }>();
      if (!company && user)
        company = await database()
          .prepare(
            `SELECT o.owner_id FROM corporate_templates t JOIN corporate_active_organisations o ON o.id=t.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=? AND m.active=1 WHERE json_extract(t.template_json,'$.logoUrl')=? OR json_extract(t.template_json,'$.coverUrl')=? LIMIT 1`,
          )
          .bind(user.userId, url, url)
          .first<{ owner_id: string }>();
      if (!company && user) company=await database().prepare(`SELECT o.owner_id FROM corporate_prepared_cards p JOIN corporate_active_organisations o ON o.id=p.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=? AND m.active=1 WHERE json_extract(p.draft_json,'$.photoUrl')=? AND (m.role='leader' OR p.account_id=m.account_id) LIMIT 1`).bind(user.userId,url).first<{owner_id:string}>();
      if (!company) return missing();
      try {
        await corporatePlan(company.owner_id);
      } catch {
        return missing();
      }
    }
  }
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
