import { reserveUpload, releaseUpload } from '@/lib/server-upload-quota';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { env } from 'cloudflare:workers';
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json(
      { error: 'Inicie sessão para guardar o design.' },
      { status: 401 },
    );
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  try {
    if (!env.PROFILE_PHOTOS) throw Error('Armazenamento indisponível.');
    const reader = request.body?.getReader();
    if (!reader) throw Error('Ficheiro em falta.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8 * 1024 * 1024) {
        await reader.cancel();
        return Response.json({ error: 'Máximo: 8 MB.' }, { status: 413 });
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
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
    if (!png && !jpg && !pdf)
      return Response.json({ error: 'Use PNG, JPG ou PDF.' }, { status: 422 });
    const id = crypto.randomUUID();
    if (!(await reserveUpload(id, user.userId, 'designs', size)))
      return Response.json(
        {
          error:
            'Limite de armazenamento atingido (50 MB ou 100 ficheiros). Contacte o apoio.',
        },
        { status: 429 },
      );
    try {
      await env.PROFILE_PHOTOS.put(`designs/${id}`, bytes, {
        httpMetadata: {
          contentType: pdf
            ? 'application/pdf'
            : png
              ? 'image/png'
              : 'image/jpeg',
        },
        customMetadata: { ownerId: user.userId },
      });
    } catch (e) {
      await releaseUpload(id, user.userId);
      throw e;
    }
    return Response.json({ id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { error: 'Não foi possível guardar o ficheiro.' },
      { status: 503 },
    );
  }
}
