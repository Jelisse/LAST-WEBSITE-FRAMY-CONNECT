import { getChatGPTUser } from '@/app/chatgpt-auth';
import { visitorBookAccess } from '@/lib/server-visitor-book';
import { qrPNG } from '@/lib/qr-png';
import { siteURL } from '@/lib/server-site';
export const dynamic = 'force-dynamic';
export async function GET(r: Request) {
  const u = await getChatGPTUser();
  if (!u) return new Response(null, { status: 401 });
  try {
    const { book } = await visitorBookAccess(
      u.userId,
      new URL(r.url).searchParams.get('book') || '',
    );
    const origin = /^(localhost|127\.0\.0\.1)$/.test(new URL(r.url).hostname)
      ? new URL(r.url).origin
      : siteURL()?.origin;
    if (!origin) throw Error();
    return new Response(await qrPNG(origin + '/visita/' + book.public_id), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline; filename="framy-recepcao.png"',
      },
    });
  } catch {
    return new Response(null, { status: 403 });
  }
}
