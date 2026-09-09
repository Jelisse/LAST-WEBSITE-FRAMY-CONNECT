import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageCatalog, getProducts } from '@/lib/server-catalog';
import { validateProduct } from '@/lib/product-validation';
import { database } from '@/lib/server-db';
import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    if (!(await canManageCatalog(user.userId)))
      return json({ error: 'Acesso reservado à gestão do catálogo.' }, 403);
    return json({ products: await getProducts() });
  } catch {
    return json({ error: 'Catálogo temporariamente indisponível.' }, 503);
  }
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  try {
    if (!(await canManageCatalog(user.userId)))
      return json({ error: 'Acesso reservado à gestão do catálogo.' }, 403);
    if (Number(request.headers.get('content-length')) > 16000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const raw = await request.text();
    if (raw.length > 16000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return json({ error: 'Pedido inválido.' }, 422);
    }
    const current = (await getProducts()).find((p) => p.id === data?.id);
    if (!current) return json({ error: 'Produto não encontrado.' }, 404);
    let product;
    try {
      product = validateProduct(data, current);
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : 'Produto inválido.' },
        422,
      );
    }
    if (product.imageUrl.startsWith('/api/product-image/')) {
      const asset = await env.PROFILE_PHOTOS?.head(
        `products/${product.imageUrl.split('/').pop()}`,
      );
      if (!asset)
        return json(
          { error: 'A imagem já não está disponível. Carregue-a novamente.' },
          422,
        );
    }
    const result = await database()
      .prepare(`INSERT INTO product_catalog (id,data_json,version,updated_by,updated_at)
      SELECT ?,?,1,?,? WHERE COALESCE((SELECT version FROM product_catalog WHERE id=?),0)=?
      ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,version=product_catalog.version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(
        product.id,
        JSON.stringify(product),
        user.userId,
        new Date().toISOString(),
        product.id,
        product.version,
      )
      .run();
    if (!result.meta.changes)
      return json(
        {
          error:
            'Este produto foi alterado. Recarregue os dados antes de guardar.',
        },
        409,
      );
    return json({ product: { ...product, version: product.version + 1 } });
  } catch {
    return json(
      { error: 'Não foi possível guardar o produto. Tente novamente.' },
      503,
    );
  }
}
