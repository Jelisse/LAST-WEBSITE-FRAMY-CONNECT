import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic = 'force-dynamic';
const MAX_BYTES = 5 * 1024 * 1024;
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Inicie sessão.' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Origem não autorizada.' }, { status: 403 });
  if (!env.PROFILE_PHOTOS)
    return Response.json(
      { error: 'Fotografias temporariamente indisponíveis.' },
      { status: 503 },
    );
  if (Number(request.headers.get('content-length')) > MAX_BYTES)
    return Response.json(
      { error: 'A fotografia deve ter até 5 MB.' },
      { status: 413 },
    );
  const reader = request.body?.getReader();
  if (!reader)
    return Response.json({ error: 'Escolha uma fotografia.' }, { status: 422 });
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        return Response.json(
          { error: 'A fotografia deve ter até 5 MB.' },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    );
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
    if (!png && !jpeg && !webp)
      return Response.json(
        { error: 'Use uma fotografia JPG, PNG ou WebP.' },
        { status: 422 },
      );
    const id = crypto.randomUUID();
    await env.PROFILE_PHOTOS.put(`profiles/${id}`, bytes, {
      httpMetadata: {
        contentType: png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/webp',
      },
      customMetadata: { ownerId: user.userId },
    });
    return Response.json(
      { photoUrl: `/api/profile-photo/${id}` },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'Não foi possível carregar a fotografia. Tente novamente.' },
      { status: 503 },
    );
  }
}
