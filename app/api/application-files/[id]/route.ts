import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageCatalog } from '@/lib/server-catalog';
import { database } from '@/lib/server-db';
export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = {
    'Cache-Control': 'private,no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  };
  try {
    const u = await getChatGPTUser();
    if (!u) return new Response(null, { status: 401, headers });
    const { id } = await params;
    const row = await database()
      .prepare(
        'SELECT f.application_id,a.owner_id FROM application_files f JOIN agent_applications a ON a.id=f.application_id WHERE f.id=?',
      )
      .bind(id)
      .first<{ application_id: string; owner_id: string }>();
    if (
      !row ||
      (row.owner_id !== u.userId && !(await canManageCatalog(u.userId)))
    )
      return new Response(null, { status: 404, headers });
    const image = await env.PROFILE_PHOTOS?.get(
      `applications/${row.application_id}/${id}`,
    );
    if (!image) return new Response(null, { status: 404, headers });
    if (row.owner_id !== u.userId)
      await database()
        .prepare('INSERT INTO manager_audit VALUES(?,?,?,?,?)')
        .bind(
          crypto.randomUUID(),
          u.userId,
          'Consulta de documento de candidatura',
          row.application_id,
          new Date().toISOString(),
        )
        .run();
    return new Response(image.body, {
      headers: {
        ...headers,
        'Content-Type': image.httpMetadata?.contentType || 'image/jpeg',
      },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
