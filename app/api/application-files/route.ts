import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { reserveUpload, releaseUpload } from '@/lib/server-upload-quota';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const u = await getChatGPTUser();
    if (!u) return json({ error: 'Inicie sessão.' }, 401);
    if (!(await rateLimit(request, 'application-upload', 30)))
      return json({ error: 'Tente novamente mais tarde.' }, 429);
    const kind = new URL(request.url).searchParams.get('kind');
    if (!kind || !['portrait', 'id-front', 'id-back'].includes(kind))
      return json({ error: 'Tipo de fotografia inválido.' }, 422);
    const db = database();
    const app = await db
      .prepare(
        "SELECT id,version FROM agent_applications WHERE owner_id=? AND status IN ('DRAFT','NEEDS_INFO')",
      )
      .bind(u.userId)
      .first<{ id: string; version: number }>();
    if (!app)
      return json(
        {
          error:
            'Guarde os dados da candidatura antes de carregar fotografias.',
        },
        409,
      );
    const reader = request.body?.getReader();
    if (!reader || !env.PROFILE_PHOTOS)
      return json({ error: 'Carregamento indisponível.' }, 503);
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8 * 1024 * 1024) {
        await reader.cancel();
        return json({ error: 'Cada fotografia deve ter até 8 MB.' }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
        (v, i) => bytes[i] === v,
      ),
      jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
    if (!png && !jpeg && !webp)
      return json({ error: 'Use fotografias PNG, JPG ou WebP.' }, 422);
    const id = crypto.randomUUID(),
      key = `applications/${app.id}/${id}`;
    if (!(await reserveUpload(id, u.userId, 'application', size)))
      return json(
        { error: 'Limite de carregamentos atingido. Contacte o apoio.' },
        413,
      );
    const previous = await db
      .prepare(
        'SELECT id FROM application_files WHERE application_id=? AND kind=?',
      )
      .bind(app.id, kind)
      .first<{ id: string }>();
    try {
      await env.PROFILE_PHOTOS.put(key, bytes, {
        httpMetadata: {
          contentType: png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp',
        },
      });
      const results = await db.batch([
        db
          .prepare(`INSERT INTO application_files(id,application_id,kind) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM agent_applications WHERE id=? AND owner_id=? AND version=? AND status IN ('DRAFT','NEEDS_INFO'))
          ON CONFLICT(application_id,kind) DO UPDATE SET id=excluded.id`)
          .bind(id, app.id, kind, app.id, u.userId, app.version),
        db
          .prepare(
            'UPDATE agent_applications SET version=version+1,updated_at=? WHERE id=? AND changes()>0',
          )
          .bind(new Date().toISOString(), app.id),
      ]);
      if (!results[0].meta.changes) {
        await env.PROFILE_PHOTOS.delete(key);
        await releaseUpload(id, u.userId);
        return json(
          {
            error:
              'A candidatura mudou. Actualize antes de carregar novamente.',
          },
          409,
        );
      }
    } catch {
      await env.PROFILE_PHOTOS.delete(key).catch(() => {});
      await releaseUpload(id, u.userId);
      throw Error('upload failed');
    }
    if (previous) {
      await env.PROFILE_PHOTOS.delete(
        `applications/${app.id}/${previous.id}`,
      ).catch(() => {});
      await releaseUpload(previous.id, u.userId).catch(() => {});
    }
    return json({ id, kind, version: app.version + 1 });
  } catch {
    return json({ error: 'Não foi possível carregar a fotografia.' }, 503);
  }
}
