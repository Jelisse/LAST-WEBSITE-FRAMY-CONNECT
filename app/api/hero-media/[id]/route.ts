import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const object = await env.PROFILE_PHOTOS?.get(`hero/assets/${id}`, { range: request.headers });
  if (!object) return new Response(null, { status: 404 });
  const headers = new Headers({
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public,max-age=31536000,immutable',
    'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', ETag: object.httpEtag,
  });
  const range = object.range;
  if (range && 'offset' in range && range.offset !== undefined && range.length !== undefined) {
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
    headers.set('Content-Length', String(range.length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(object.size));
  return new Response(object.body, { headers });
}
