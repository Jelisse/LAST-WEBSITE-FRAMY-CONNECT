import { database } from './server-db';
import { products, type Product } from './catalog';

export async function canManageCatalog(userId: string) {
  return !!(await database()
    .prepare('SELECT user_id FROM catalog_managers WHERE user_id=?')
    .bind(userId)
    .first());
}
export async function getProducts(): Promise<Product[]> {
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
  return merged;
}
