import { database } from './server-db';
import { products, productOrder, type Product } from './catalog';

export async function canManageCatalog(userId: string) {
  return !!(await database()
    .prepare(
      "SELECT id FROM auth_accounts WHERE id=? AND role IN ('manager','director') AND active=1",
    )
    .bind(userId)
    .first());
}
export async function getProducts(): Promise<Product[]> {
  // One-time physical inventory count supplied by the owner. Keep the movement
  // history; later edits and sales are never reset by reads or redeployment.
  await database()
    .prepare(`INSERT OR IGNORE INTO stock_movements(id,product_id,quantity,reason,actor,created_at,agent_id)
    SELECT 'owner-count-keychain-20260918','keychain',500-COALESCE(SUM(quantity),0),
    'Contagem física confirmada pelo proprietário: 500 porta-chaves','system:owner-count',?,''
    FROM stock_movements WHERE product_id='keychain'`)
    .bind(new Date().toISOString())
    .run();
  const result = await database()
    .prepare('SELECT id,data_json,version FROM product_catalog')
    .all<{ id: string; data_json: string; version: number }>();
  const merged = products.map((seed) => {
    const row = result.results.find((r) => r.id === seed.id);
    return row
      ? {
          ...seed,
          ...JSON.parse(row.data_json),
          id: seed.id,
          version: row.version,
        }
      : seed;
  });
  for (const row of result.results)
    if (!products.some((p) => p.id === row.id))
      merged.push({
        ...JSON.parse(row.data_json),
        id: row.id,
        version: row.version,
      });
  return merged.map((p) => ({
    ...p,
    published: p.published !== false,
    available: p.availabilityConfigured ? p.available : p.id === 'keychain',
    images: p.images?.length ? p.images : [p.imageUrl],
  })).sort(productOrder);
}
