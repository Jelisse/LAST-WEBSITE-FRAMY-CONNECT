export const profileJSON = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
export async function profileBody(
  request: Request,
  max = 16000,
): Promise<Record<string, unknown>> {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw Error('Origem não autorizada.');
  const reader = request.body?.getReader();
  if (!reader) throw Error('Pedido vazio.');
  let size = 0,
    raw = '';
  const decoder = new TextDecoder();
  for (;;) {
    const c = await reader.read();
    if (c.done) break;
    size += c.value.length;
    if (size > max) {
      await reader.cancel();
      throw Error('Pedido demasiado grande.');
    }
    raw += decoder.decode(c.value, { stream: true });
  }
  const body = JSON.parse(raw + decoder.decode());
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw Error('Pedido inválido.');
  return body;
}
