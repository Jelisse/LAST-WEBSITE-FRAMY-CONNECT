import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageCatalog } from '@/lib/server-catalog';
import { getHeroMedia } from '@/lib/server-hero-media';
import { isHeroSlot, heroMediaType } from '@/lib/hero-media';
import { reserveUpload, releaseUpload } from '@/lib/server-upload-quota';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(await getHeroMedia(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Não foi possível carregar.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Inicie sessão.' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Origem não autorizada.' }, { status: 403 });
  try {
    if (!(await canManageCatalog(user.userId)))
      return Response.json({ error: 'Acesso reservado ao gestor.' }, { status: 403 });
    if (!(await rateLimit(request, 'hero-upload', 30)))
      return Response.json({ error: 'Tente mais tarde.' }, { status: 429 });
    const slot = new URL(request.url).searchParams.get('slot') ?? '';
    if (!isHeroSlot(slot)) return Response.json({ error: 'Campo inválido.' }, { status: 422 });
    if (!env.PROFILE_PHOTOS || !request.body)
      return Response.json({ error: 'Carregamento indisponível.' }, { status: 503 });
    const video = slot.startsWith('video');
    const limit = (video ? 25 : 8) * 1024 * 1024;
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        return Response.json({ error: video ? 'O vídeo deve ter até 25 MB.' : 'A imagem deve ter até 8 MB.' }, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const contentType = heroMediaType(bytes, video);
    if (!contentType) return Response.json({ error: video ? 'Use um vídeo MP4.' : 'Use PNG, JPG ou WebP.' }, { status: 422 });
    const id = crypto.randomUUID();
    if (!(await reserveUpload(id, user.userId, 'product', size)))
      return Response.json({ error: 'Limite de armazenamento atingido.' }, { status: 413 });
    const url = `/api/hero-media/${id}`;
    try {
      await env.PROFILE_PHOTOS.put(`hero/assets/${id}`, bytes, {
        httpMetadata: { contentType }, customMetadata: { uploadedBy: user.userId, slot },
      });
      // Independent slots avoid overwriting another manager's unrelated edit.
      await env.PROFILE_PHOTOS.put(`hero/settings/${slot}`, JSON.stringify({ url }), {
        httpMetadata: { contentType: 'application/json' },
      });
    } catch (error) {
      await env.PROFILE_PHOTOS.delete(`hero/assets/${id}`);
      await releaseUpload(id, user.userId);
      throw error;
    }
    return Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Não foi possível guardar. Tente novamente.' }, { status: 503 }); }
}
