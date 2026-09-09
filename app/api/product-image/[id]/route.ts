import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const image = await env.PROFILE_PHOTOS?.get(`products/${id}`);
  if (!image) return new Response(null, { status: 404 });
  return new Response(image.body, {
    headers: {
      'Content-Type': image.httpMetadata?.contentType ?? 'image/png',
      'Cache-Control': 'public,max-age=31536000,immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
