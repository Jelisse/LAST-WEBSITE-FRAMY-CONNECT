import { publicProduct } from '@/lib/catalog';
import { getProducts } from '@/lib/server-catalog';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json(
      { products: (await getProducts()).map(publicProduct) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'Catálogo temporariamente indisponível.' },
      { status: 503 },
    );
  }
}
