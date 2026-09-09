import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageCatalog } from '@/lib/server-catalog';
import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Inicie sessão.' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Origem não autorizada.' }, { status: 403 });
  try {
    if (!(await canManageCatalog(user.userId)))
      return Response.json(
        { error: 'Sem permissão para editar produtos.' },
        { status: 403 },
      );
    const reader = request.body?.getReader();
    if (!reader || !env.PROFILE_PHOTOS)
      return Response.json(
        { error: 'Carregamento indisponível.' },
        { status: 503 },
      );
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8 * 1024 * 1024) {
        await reader.cancel();
        return Response.json(
          { error: 'A imagem deve ter até 8 MB.' },
          { status: 413 },
        );
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
    );
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
    if (!png && !jpeg && !webp)
      return Response.json({ error: 'Use PNG, JPG ou WebP.' }, { status: 422 });
    const id = crypto.randomUUID();
    await env.PROFILE_PHOTOS.put(`products/${id}`, bytes, {
      httpMetadata: {
        contentType: png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp',
      },
      customMetadata: { uploadedBy: user.userId },
    });
    return Response.json(
      { imageUrl: `/api/product-image/${id}` },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'Não foi possível carregar a imagem.' },
      { status: 503 },
    );
  }
}
