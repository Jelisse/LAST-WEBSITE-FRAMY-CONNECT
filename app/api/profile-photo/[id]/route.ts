import { activeProfileSQL } from '@/lib/entitlement';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
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
        `SELECT owner_id FROM profiles WHERE json_extract(published_json, '$.photoUrl')=? AND owner_id=? AND ${activeProfileSQL} LIMIT 1`,
      )
      .bind(
        `/api/profile-photo/${id}`,
        object.customMetadata?.ownerId ?? '',
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .first();
    if (!published) return missing();
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
